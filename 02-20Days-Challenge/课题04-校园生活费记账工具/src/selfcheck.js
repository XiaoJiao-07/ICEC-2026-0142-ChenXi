'use strict';
/**
 * selfcheck.js — 每日收工自查（只读，不写任何日志）
 * 运行：node src/selfcheck.js
 * 检查：今日是否有真实日志 / 链是否完整 / 今日是否有 commit / commit 是否锚定了链头
 */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const t = require('./telemetry');

const today = t.localDate();
const file = path.join(t.LOG_DIR, 'telemetry_' + today + '.log');
const results = [];
// git 命令固定在本文件所在的项目目录下执行：
// 否则从别的目录（如桌面、或上层工作区）调用时，git 找不到仓库，
// 会把「今天有 commit」误判为没提交。
const PROJ_DIR = path.resolve(__dirname, '..');
const GIT_OPTS = { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], cwd: PROJ_DIR };

function chk(name, ok, hint) { results.push({ name: name, ok: ok, hint: hint || '' }); }

// 1. 今日日志
const exists = fs.existsSync(file);
const lines = exists ? fs.readFileSync(file, 'utf8').split('\n').filter(function (l) { return l.trim(); }) : [];
chk('今日日志文件存在且有记录 (' + lines.length + ' 条)', exists && lines.length > 0,
  '今天还没有真实运行过程序：先去用它，不要手补文件。');

// 2. 时间戳真实性：必须带毫秒和时区，且日期为今天
let tsOk = lines.length > 0;
lines.forEach(function (l) {
  let e; try { e = JSON.parse(l); } catch (err) { tsOk = false; return; }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/.test(e.ts || '')) tsOk = false;
  if ((e.ts || '').slice(0, 10) !== today) tsOk = false;
});
chk('时间戳为系统真实时间（含毫秒/时区）', tsOk, '若出现整点或手写格式，说明不是程序运行时产生。');

// 3. 错误记录：连续多日全无报错往往意味着日志是摆拍
const errCount = lines.filter(function (l) {
  try { const e = JSON.parse(l); return e.error && e.error.length > 0; } catch (err) { return false; }
}).length;
const errLabel = lines.length < 3
  ? '存在真实报错/异常记录 (起步阶段，暂不要求)'
  : '存在真实报错/异常记录 (' + errCount + ' 条)';
chk(errLabel, errCount > 0 || lines.length < 3,
  '真实使用一定会遇到无效输入或异常路径，别把错误吞掉；故意输入一次非法金额即可。');

// 4. 链完整
const v = t.verifyAll();
chk('哈希链完整无篡改', v.ok, v.problems.slice(0, 3).join(' / '));

// 5. 今日 commit
let commits = '';
try {
  commits = cp.execFileSync('git', ['log', '--since=' + today + ' 00:00', '--pretty=%h %s'], GIT_OPTS).trim();
} catch (e) { commits = ''; }
const hasCommit = commits.length > 0;
chk('今天已有 git commit', hasCommit, '没有当天提交 = 又回到「一次性补交」的老问题。');

// 6. commit message 锚定链头
let lastMsg = '';
try {
  lastMsg = cp.execFileSync('git', ['log', '-1', '--pretty=%B'], GIT_OPTS).trim();
} catch (e) { lastMsg = ''; }
const head8 = v.head.slice(0, 8);
const anchored = v.head !== 'GENESIS' && lastMsg.indexOf(head8) >= 0;
chk('最新 commit 锚定了链头 ' + head8, anchored, 'commit message 里加上 | head=' + head8);

console.log('=== ' + today + ' 收工自查 ===');
results.forEach(function (r) {
  console.log((r.ok ? '[OK]   ' : '[TODO] ') + r.name);
  if (!r.ok && r.hint) console.log('       -> ' + r.hint);
});
console.log('');
const todo = results.filter(function (r) { return !r.ok; }).length;
console.log(todo === 0 ? '全部通过，可以 push 收工。' : '还有 ' + todo + ' 项未完成，先补齐再收工。');
process.exit(todo === 0 ? 0 : 1);
