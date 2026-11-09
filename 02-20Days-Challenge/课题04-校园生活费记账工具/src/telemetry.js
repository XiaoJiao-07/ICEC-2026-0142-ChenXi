'use strict';
/**
 * telemetry.js — append-only 可自证遥测模块
 *
 * 设计目标：让「日志无法被事后伪造」，而不是「日志看起来很多」。
 *  - 只追加，永不覆盖：全程 appendFileSync(flag:'a')，没有任何 writeFileSync 覆写路径。
 *  - 哈希链：每行携带上一条的 hash，hash = sha256(本行除 hash 外的稳定字段序列)。
 *  - 跨日不断链：新一天的第一条 prev_hash 接前一天最后一条。
 *  - 真实时间：本地时区 + 毫秒，由系统时钟产生，不接受外部传入的时间戳。
 *  - 断点明确：CHAIN_START 之前的旧文件不纳入链（早期演示数据由 CORRECTION.md 声明）。
 *
 * 用法（在你的 app.js / main.js 中）：
 *   const { record } = require('./telemetry');
 *   // 成功路径
 *   record('add', { amount, category }, { elapsed_ms: Date.now() - start });
 *   // 失败路径（必须真实记录，不要吞掉）
 *   record('add', { amount, category }, { elapsed_ms: Date.now() - start, error: e.message });
 *
 * 日志目录：环境变量 TELEMETRY_DIR（默认 当前工作目录/process_logs）
 * 链起始日：环境变量 CHAIN_START（默认 2026-11-09）
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const GENESIS = 'GENESIS';
const CHAIN_START = process.env.CHAIN_START || '2026-11-09';
// 默认取「src/ 的上一级 /process_logs」，而不是 process.cwd()：
// 这样无论从仓库根目录、项目目录还是 .bat 双击启动，日志都落在同一个地方。
const DEFAULT_LOG_DIR = path.resolve(__dirname, '..', 'process_logs');
const LOG_DIR = process.env.TELEMETRY_DIR
  ? path.resolve(process.env.TELEMETRY_DIR)
  : DEFAULT_LOG_DIR;

function pad(n, w) { return String(n).padStart(w || 2, '0'); }

function localDate(d) {
  d = d || new Date();
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function localStamp(d) {
  d = d || new Date();
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  const tz = sign + pad(Math.floor(Math.abs(off) / 60)) + ':' + pad(Math.abs(off) % 60);
  return localDate(d) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' +
    pad(d.getSeconds()) + '.' + pad(d.getMilliseconds(), 3) + tz;
}

function sha256(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }

function dateFromFile(f) { return f.slice(10, 20); }

function listLogFiles() {
  if (!fs.existsSync(LOG_DIR)) return [];
  return fs.readdirSync(LOG_DIR)
    .filter(function (f) {
      return /^telemetry_\d{4}-\d{2}-\d{2}\.log$/.test(f) && dateFromFile(f) >= CHAIN_START;
    })
    .sort()
    .map(function (f) { return path.join(LOG_DIR, f); });
}

function readLines(file) {
  return fs.readFileSync(file, 'utf8').split('\n').filter(function (l) { return l.trim().length > 0; });
}

function parse(line) {
  try { return JSON.parse(line); } catch (e) { return null; }
}

// 固定字段顺序，保证哈希可复现；hash 字段本身不参与计算
function payloadOf(e) {
  return JSON.stringify({
    seq: e.seq, ts: e.ts, action: e.action, details: e.details,
    elapsed_ms: e.elapsed_ms, error: e.error, prev_hash: e.prev_hash
  });
}

function hashOf(e) { return sha256(payloadOf(e)); }

function chainState() {
  let head = GENESIS;
  let seq = 0;
  listLogFiles().forEach(function (file) {
    readLines(file).forEach(function (line) {
      const e = parse(line);
      if (!e || typeof e.hash !== 'string') return;
      head = e.hash;
      if (typeof e.seq === 'number' && e.seq > seq) seq = e.seq;
    });
  });
  return { head: head, seq: seq };
}

/**
 * 追加一条真实运行记录。不允许传入时间戳、不允许指定日期。
 */
function record(action, details, opts) {
  opts = opts || {};
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const state = chainState();
  const entry = {
    seq: state.seq + 1,
    ts: localStamp(),
    action: String(action),
    details: typeof details === 'string' ? details : JSON.stringify(details || {}),
    elapsed_ms: (opts.elapsed_ms === undefined || opts.elapsed_ms === null) ? null : Number(opts.elapsed_ms),
    error: String(opts.error || ''),
    prev_hash: state.head
  };
  entry.hash = hashOf(entry);
  // 唯一写入点：只追加，绝不覆盖历史文件
  fs.appendFileSync(path.join(LOG_DIR, 'telemetry_' + localDate() + '.log'),
    JSON.stringify(entry) + '\n', { encoding: 'utf8', flag: 'a' });
  return entry;
}

/**
 * 校验整条链：逐行重算哈希、检查 prev_hash 与 seq 连续性。
 */
function verifyAll() {
  const problems = [];
  const daily = [];
  let expectedPrev = GENESIS;
  let expectedSeq = 0;
  let total = 0;

  listLogFiles().forEach(function (file) {
    const lines = readLines(file);
    let dayHead = null;
    lines.forEach(function (line, i) {
      const loc = path.basename(file) + ':' + (i + 1);
      const e = parse(line);
      if (!e) { problems.push(loc + ' 无法解析为 JSON'); return; }
      const recomputed = hashOf(e);
      if (typeof e.hash !== 'string') problems.push(loc + ' 缺少 hash 字段');
      if (e.prev_hash !== expectedPrev) problems.push(loc + ' prev_hash 断裂（记录被插入、删除或前一行被改动）');
      if (recomputed !== e.hash) problems.push(loc + ' hash 不匹配（内容被改动）');
      if (e.seq !== expectedSeq + 1) problems.push(loc + ' seq 不连续（期望 ' + (expectedSeq + 1) + '，实得 ' + e.seq + '）');
      // 用「重算值」推进链，而不是文件里自报的 hash：改动任意一行，
      // 之后所有行的 prev_hash 都会对不上，篡改无法被局部掩盖。
      expectedPrev = recomputed;
      expectedSeq = e.seq;
      dayHead = recomputed;
      total++;
    });
    daily.push({ date: dateFromFile(path.basename(file)), lines: lines.length, head: dayHead });
  });

  return {
    ok: problems.length === 0,
    problems: problems,
    total: total,
    daily: daily,
    head: expectedPrev,
    chainStart: CHAIN_START,
    logDir: LOG_DIR
  };
}

function head() { return chainState().head; }

module.exports = { record: record, verifyAll: verifyAll, head: head, localDate: localDate, localStamp: localStamp, LOG_DIR: LOG_DIR, CHAIN_START: CHAIN_START };

if (require.main === module) {
  console.log('telemetry.js 是被你的程序调用的模块，不单独生成日志。');
  console.log('日志目录: ' + LOG_DIR);
  console.log('链起始日: ' + CHAIN_START);
  console.log('当前链头: ' + head());
  console.log('校验请运行: node verify_chain.js');
}
