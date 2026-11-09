/*
 * ============================================================
 * main.js - 校园生活费记账工具 核心程序
 * 项目四：解决校园真实痛点的轻量化实用程序研发与日常运行日志验证
 * 作者：陈曦 | 大一 | 信息与通信
 * GitHub: XiaoJiao-07/ICEC-2026-0142-ChenXi
 * ============================================================
 */

const fs = require('fs');
const path = require('path');
const { record, verifyAll } = require('./src/telemetry');

const BASE_DIR = __dirname;
const DATA_DIR = path.join(BASE_DIR, 'data');
const LOG_DIR = path.join(BASE_DIR, 'process_logs');
const DATA_FILE = path.join(DATA_DIR, 'expenses.json');
const CATEGORIES = ['餐饮', '交通', '购物', '娱乐', '学习', '医疗', '其他'];
const callCount = {};

// 2026-11-09 改造：内置消费数组（本人真实消费）已迁移到 raw_data/baseline_2026-10.csv；
// 预置日志常量已移除，旧日志文件原样保留，性质见仓库根 CORRECTION.md。
// 此后日志一律由 src/telemetry.js 在运行时 append-only 追加。

// ==================== 基础函数 ====================
function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

function loadData() {
  ensureDirs();
  if (!fs.existsSync(DATA_FILE)) return { expenses: [], version: 1 };
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function logTelemetry(action, details = '', error = '', elapsed = 0) {
  return record(action, details, { elapsed_ms: elapsed, error: error });
}

// ==================== 核心功能 ====================
function addExpense(amount, category, note = '') {
  const start = Date.now();
  try {
    if (!CATEGORIES.includes(category)) throw new Error(`无效类别: ${category}，可选: ${CATEGORIES.join(', ')}`);
    amount = parseFloat(amount);
    if (isNaN(amount) || amount <= 0) throw new Error('金额必须大于0');
    const data = loadData();
    const today = new Date().toISOString().split('T')[0];
    data.expenses.push({ id: data.expenses.length + 1, amount, category, note, date: today, created_at: new Date().toLocaleString('zh-CN', { hour12: false }) });
    saveData(data);
    const elapsed = Date.now() - start;
    logTelemetry('add', `amount=${amount}, category=${category}`, '', elapsed);
    console.log(`[OK] 已记录: ${amount.toFixed(2)} [${category}] ${note}  (耗时 ${elapsed}ms)`);
  } catch (e) {
    logTelemetry('add', `amount=${amount}, category=${category}`, e.message, Date.now() - start);
    console.log(`[ERROR] ${e.message}`);
  }
}

// v1.1 新增：批量记账（基于日志分析：用户每天多次调用add，王同学反馈"每天吃饭都要记太麻烦"）
function batchAdd(input) {
  const start = Date.now();
  try {
    const entries = input.split('|').map(s => s.trim()).filter(s => s);
    if (entries.length === 0) throw new Error('批量记账格式: 金额,类别,备注|金额,类别,备注');
    const data = loadData();
    const today = new Date().toISOString().split('T')[0];
    let added = 0;
    const errors = [];
    for (const entry of entries) {
      const parts = entry.split(',').map(s => s.trim());
      if (parts.length < 2) { errors.push('格式错误: ' + entry); continue; }
      const amount = parseFloat(parts[0]);
      const category = parts[1];
      const note = parts[2] || '';
      if (isNaN(amount) || amount <= 0) { errors.push('金额无效: ' + entry); continue; }
      if (!CATEGORIES.includes(category)) { errors.push('类别无效: ' + entry); continue; }
      data.expenses.push({ id: data.expenses.length + 1, amount, category, note, date: today, created_at: new Date().toLocaleString('zh-CN', { hour12: false }) });
      added++;
    }
    saveData(data);
    const elapsed = Date.now() - start;
    logTelemetry('batch_add', 'entries=' + entries.length + ', added=' + added, errors.join('; '), elapsed);
    console.log('[OK] 批量记账完成: 成功 ' + added + '/' + entries.length + ' 笔 (耗时 ' + elapsed + 'ms)');
    if (errors.length > 0) { console.log('[WARN] 以下条目跳过:'); errors.forEach(function(e) { console.log('  - ' + e); }); }
  } catch (e) {
    logTelemetry('batch_add', 'input=' + input, e.message, Date.now() - start);
    console.log('[ERROR] ' + e.message);
  }
}

// v1.2 新增：删除记录（陈同学反馈"记错了想删掉或者修改，发现没有这个功能"）
function deleteExpense(id) {
  const start = Date.now();
  try {
    const data = loadData();
    id = parseInt(id);
    const idx = data.expenses.findIndex(function(e) { return e.id === id; });
    if (idx === -1) throw new Error('记录不存在: ID=' + id);
    const removed = data.expenses.splice(idx, 1)[0];
    saveData(data);
    const elapsed = Date.now() - start;
    logTelemetry('delete', 'id=' + id + ', amount=' + removed.amount, '', elapsed);
    console.log('[OK] 已删除: ID=' + id + ' ' + removed.amount.toFixed(2) + ' [' + removed.category + '] ' + removed.note);
  } catch (e) {
    logTelemetry('delete', 'id=' + id, e.message, Date.now() - start);
    console.log('[ERROR] ' + e.message);
  }
}

// v1.2 新增：修改记录
function modifyExpense(id, amount, category, note) {
  const start = Date.now();
  try {
    const data = loadData();
    id = parseInt(id);
    const item = data.expenses.find(function(e) { return e.id === id; });
    if (!item) throw new Error('记录不存在: ID=' + id);
    if (amount !== undefined) { amount = parseFloat(amount); if (isNaN(amount) || amount <= 0) throw new Error('金额必须大于0'); item.amount = amount; }
    if (category !== undefined) { if (!CATEGORIES.includes(category)) throw new Error('无效类别: ' + category); item.category = category; }
    if (note !== undefined) item.note = note;
    saveData(data);
    const elapsed = Date.now() - start;
    logTelemetry('modify', 'id=' + id, '', elapsed);
    console.log('[OK] 已修改: ID=' + id + ' -> ' + item.amount.toFixed(2) + ' [' + item.category + '] ' + item.note);
  } catch (e) {
    logTelemetry('modify', 'id=' + id, e.message, Date.now() - start);
    console.log('[ERROR] ' + e.message);
  }
}

function listExpenses(days = 7) {
  const start = Date.now();
  try {
    const data = loadData();
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    const filtered = data.expenses.filter(e => e.date >= cutoffStr).sort((a, b) => b.date.localeCompare(a.date));
    if (filtered.length === 0) { console.log(`最近${days}天无记录`); return; }
    console.log(`\n${'日期'.padEnd(12)} ${'金额'.padStart(8)} ${'类别'.padEnd(6)} 备注`);
    console.log('-'.repeat(50));
    let total = 0;
    for (const e of filtered) { console.log(`${e.date.padEnd(12)} ${e.amount.toFixed(2).padStart(7)} ${e.category.padEnd(6)} ${e.note}`); total += e.amount; }
    console.log('-'.repeat(50));
    console.log(`${'合计'.padEnd(12)} ${total.toFixed(2).padStart(7)}  (${filtered.length}笔)`);
    logTelemetry('list', `days=${days}, count=${filtered.length}`, '', Date.now() - start);
  } catch (e) { logTelemetry('list', `days=${days}`, e.message, Date.now() - start); console.log(`[ERROR] ${e.message}`); }
}

function dailySummary(targetDate = null) {
  const start = Date.now();
  try {
    const data = loadData();
    if (!targetDate) targetDate = new Date().toISOString().split('T')[0];
    const dayExpenses = data.expenses.filter(e => e.date === targetDate);
    if (dayExpenses.length === 0) { console.log(`${targetDate} 无记录`); return; }
    const total = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
    console.log(`\n ${targetDate} 消费汇总\n${'='.repeat(40)}`);
    const catTotals = {};
    for (const e of dayExpenses) catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
    for (const [cat, amount] of Object.entries(catTotals).sort((a, b) => b[1] - a[1])) {
      const pct = (amount / total * 100).toFixed(1);
      console.log(`  ${cat.padEnd(6)} ${amount.toFixed(2).padStart(7)}  ${pct.padStart(5)}% ${'='.repeat(Math.floor(pct / 5))}`);
    }
    console.log(`\n  总计: ${total.toFixed(2)}  (${dayExpenses.length}笔)`);
    logTelemetry('summary', `date=${targetDate}`, '', Date.now() - start);
  } catch (e) { logTelemetry('summary', `date=${targetDate}`, e.message, Date.now() - start); console.log(`[ERROR] ${e.message}`); }
}

function weeklyReport() {
  const start = Date.now();
  try {
    const data = loadData();
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    const weekExpenses = data.expenses.filter(e => e.date >= cutoffStr);
    if (weekExpenses.length === 0) { console.log('最近7天无记录'); return; }
    const total = weekExpenses.reduce((sum, e) => sum + e.amount, 0);
    console.log(`\n 近7天消费报告\n${'='.repeat(50)}`);
    console.log(`  总支出: ${total.toFixed(2)}\n  日均:   ${(total / 7).toFixed(2)}\n  笔数:   ${weekExpenses.length}`);
    const catTotals = {};
    for (const e of weekExpenses) catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
    console.log(`\n  分类占比:`);
    for (const [cat, amount] of Object.entries(catTotals).sort((a, b) => b[1] - a[1])) console.log(`    ${cat.padEnd(6)} ${amount.toFixed(2).padStart(7)}  (${(amount / total * 100).toFixed(1)}%)`);
    logTelemetry('weekly_report', `total=${total.toFixed(2)}`, '', Date.now() - start);
  } catch (e) { logTelemetry('weekly_report', '', e.message, Date.now() - start); console.log(`[ERROR] ${e.message}`); }
}

function exportCSV() {
  const start = Date.now();
  try {
    const data = loadData();
    const csvFile = path.join(process.env.USERPROFILE, 'Desktop', 'expenses_export.csv');
    let csv = '\uFEFF日期,金额,类别,备注,记录时间\n';
    for (const e of data.expenses) csv += `${e.date},${e.amount},${e.category},${e.note},${e.created_at}\n`;
    fs.writeFileSync(csvFile, csv, 'utf-8');
    console.log(`[OK] 已导出到 ${csvFile}`);
    logTelemetry('export_csv', `count=${data.expenses.length}`, '', Date.now() - start);
  } catch (e) { logTelemetry('export_csv', '', e.message, Date.now() - start); console.log(`[ERROR] ${e.message}`); }
}

function showLogs() {
  const r = verifyAll();
  console.log('\n Telemetry 哈希链状态: ' + (r.ok ? '[PASS]' : '[FAIL]') + '\n' + '='.repeat(50));
  console.log('链起始日: ' + r.chainStart + ' | 日志目录: ' + r.logDir);
  r.daily.forEach(d => console.log('  ' + d.date + '  ' + d.lines + ' 条  head=' + String(d.head || '').slice(0, 12)));
  if (!r.ok) r.problems.forEach(p => console.log('  [!] ' + p));
}

function showData() {
  const data = loadData();
  console.log(`\n 消费数据概览\n${'='.repeat(50)}`);
  console.log(`  总笔数: ${data.expenses.length}`);
  console.log(`  日期范围: ${data.expenses[0]?.date} ~ ${data.expenses[data.expenses.length - 1]?.date}`);
  const total = data.expenses.reduce((sum, e) => sum + e.amount, 0);
  console.log(`  总金额: ${total.toFixed(2)}`);
  console.log(`\n  明细:`);
  for (const e of data.expenses) console.log(`    ${e.date} | ${e.amount.toFixed(2).padStart(6)} | ${e.category.padEnd(4)} | ${e.note}`);
}

module.exports = {
  ensureDirs, loadData, saveData, logTelemetry,
  addExpense, batchAdd, deleteExpense, modifyExpense,
  listExpenses, dailySummary, weeklyReport, exportCSV,
  showLogs, showData, CATEGORIES
};
