/**
 * @fileoverview 校园生活费记账工具 v3.0
 *
 * 轻量级命令行记账应用，帮助大学生快速记录和分析日常消费。
 * 支持批量记账、预算提醒、消费趋势图等功能。
 *
 * @author 陈曦 (XiaoJiao-07)
 * @version 3.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ============================================================================
// 常量
// ============================================================================

/** @const {string} 基础目录 */
const BASE_DIR = __dirname;

/** @const {string} 数据目录 */
const DATA_DIR = path.join(BASE_DIR, 'data');

/** @const {string} 日志目录 */
const LOG_DIR = path.join(BASE_DIR, 'process_logs');

/** @const {string} 原始数据目录 */
const RAW_DATA_DIR = path.join(BASE_DIR, 'raw_data');

/** @const {string} 消费数据文件 */
const DATA_FILE = path.join(DATA_DIR, 'expenses.json');

/** @const {string} 预算数据文件 */
const BUDGET_FILE = path.join(DATA_DIR, 'budget.json');

/** @const {string} 原始CSV文件 */
const RAW_CSV_FILE = path.join(RAW_DATA_DIR, 'consumption_raw.csv');

/** @const {string} 用户反馈文件 */
const FEEDBACK_FILE = path.join(BASE_DIR, 'user_feedback.md');

/** @const {Array<string>} 消费类别 */
const CATEGORIES = ['餐饮', '交通', '购物', '娱乐', '学习', '医疗', '其他'];

/** @const {Object<string, number>} 命令调用计数 */
const callCount = {};

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 确保必要的目录存在
 */
function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

/**
 * 获取下一个记录ID
 * @param {Array<Object>} expenses - 消费记录数组
 * @return {number} 下一个ID
 */
function getNextId(expenses) {
  return expenses.length > 0 ? Math.max(...expenses.map(e => e.id)) + 1 : 1;
}

/**
 * 记录 Telemetry 日志
 * @param {string} action - 操作类型
 * @param {string} details - 操作详情
 * @param {string} error - 错误信息
 * @param {number} elapsed - 执行耗时（毫秒）
 */
function logTelemetry(action, details, error, elapsed) {
  const today = new Date().toISOString().split('T')[0];
  const logFile = path.join(LOG_DIR, `log_${today}.json`);

  let logs = [];
  if (fs.existsSync(logFile)) {
    logs = JSON.parse(fs.readFileSync(logFile, 'utf-8'));
  }

  callCount[action] = (callCount[action] || 0) + 1;

  logs.push({
    timestamp: new Date().toLocaleString('zh-CN'),
    action,
    details,
    elapsed_ms: Math.round(elapsed || 0),
    call_count: callCount[action],
    error: error || ''
  });

  fs.writeFileSync(logFile, JSON.stringify(logs, null, 2), 'utf-8');
}

// ============================================================================
// 数据管理
// ============================================================================

/**
 * 加载消费数据
 * @return {Object} 包含 expenses 数组的数据对象
 */
function loadData() {
  if (fs.existsSync(DATA_FILE)) {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  }

  const expenses = loadSeedData();
  const data = { expenses };
  saveData(data);
  return data;
}

/**
 * 保存消费数据
 * @param {Object} data - 数据对象
 */
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * 从 CSV 加载种子数据
 * @return {Array<Object>} 消费记录数组
 */
function loadSeedData() {
  const expenses = [];

  if (!fs.existsSync(RAW_CSV_FILE)) {
    return expenses;
  }

  const lines = fs.readFileSync(RAW_CSV_FILE, 'utf-8').trim().split('\n');

  for (let i = 1; i < lines.length; i++) {
    const [date, amount, category, note, time] = lines[i].split(',');
    expenses.push({
      id: expenses.length + 1,
      date,
      amount: parseFloat(amount),
      category,
      note: note || '',
      time: time || '00:00',
      created_at: new Date().toISOString()
    });
  }

  return expenses;
}

/**
 * 加载预算数据
 * @return {Object} 预算对象
 */
function loadBudget() {
  if (fs.existsSync(BUDGET_FILE)) {
    return JSON.parse(fs.readFileSync(BUDGET_FILE, 'utf-8'));
  }
  return { monthly: 0 };
}

/**
 * 保存预算数据
 * @param {Object} budget - 预算对象
 */
function saveBudget(budget) {
  fs.writeFileSync(BUDGET_FILE, JSON.stringify(budget, null, 2), 'utf-8');
}

// ============================================================================
// 核心功能
// ============================================================================

/**
 * 添加消费记录
 * @param {string} amount - 金额
 * @param {string} category - 类别
 * @param {string} note - 备注
 * @param {?string} targetDate - 目标日期（YYYY-MM-DD）
 */
function addExpense(amount, category, note = '', targetDate = null) {
  const start = Date.now();

  try {
    if (!CATEGORIES.includes(category)) {
      console.log(`[ERROR] 无效类别：${category}，可选：${CATEGORIES.join(' ')}`);
      return;
    }

    const data = loadData();
    const date = targetDate || new Date().toISOString().split('T')[0];

    const expense = {
      id: getNextId(data.expenses),
      date,
      amount: parseFloat(amount),
      category,
      note,
      time: new Date().toTimeString().slice(0, 5),
      created_at: new Date().toISOString()
    };

    data.expenses.push(expense);
    saveData(data);

    console.log(`[OK] 已记录：¥${expense.amount.toFixed(2)} [${category}] ${note} (${date})`);
    checkBudget();
    logTelemetry('add', `amount=${amount}, category=${category}, date=${date}`, '', Date.now() - start);
  } catch (error) {
    logTelemetry('add', `amount=${amount}, category=${category}`, error.message, Date.now() - start);
    console.log(`[ERROR] ${error.message}`);
  }
}

/**
 * 批量添加消费记录
 * @param {string} input - 批量输入（格式：金额,类别,备注|金额,类别,备注）
 */
function batchAdd(input) {
  const start = Date.now();

  try {
    const normalized = input.replace(/，/g, ',');
    const items = normalized.split('|').map(s => s.trim());
    const data = loadData();

    let success = 0;
    let nextId = getNextId(data.expenses);

    for (const item of items) {
      const parts = item.split(',').map(s => s.trim());
      if (parts.length < 2) continue;

      const [amount, category, note] = parts;
      if (!CATEGORIES.includes(category)) continue;

      data.expenses.push({
        id: nextId++,
        date: new Date().toISOString().split('T')[0],
        amount: parseFloat(amount),
        category,
        note: note || '',
        time: new Date().toTimeString().slice(0, 5),
        created_at: new Date().toISOString()
      });
      success++;
    }

    saveData(data);
    console.log(`[OK] 批量记账完成：成功 ${success}/${items.length} 笔 (耗时 ${Date.now() - start}ms)`);
    checkBudget();
    logTelemetry('batch', `count=${success}`, '', Date.now() - start);
  } catch (error) {
    logTelemetry('batch', '', error.message, Date.now() - start);
    console.log(`[ERROR] ${error.message}`);
  }
}

/**
 * 删除消费记录
 * @param {string} id - 记录ID
 */
function deleteExpense(id) {
  const start = Date.now();

  try {
    const data = loadData();
    const idx = data.expenses.findIndex(e => e.id === parseInt(id));

    if (idx === -1) {
      console.log(`[ERROR] 未找到ID=${id}的记录`);
      return;
    }

    const removed = data.expenses.splice(idx, 1)[0];
    saveData(data);

    console.log(`[OK] 已删除：ID=${removed.id} ${removed.amount.toFixed(2)} [${removed.category}] ${removed.note}`);
    logTelemetry('delete', `id=${id}`, '', Date.now() - start);
  } catch (error) {
    logTelemetry('delete', `id=${id}`, error.message, Date.now() - start);
    console.log(`[ERROR] ${error.message}`);
  }
}

/**
 * 修改消费记录
 * @param {string} id - 记录ID
 * @param {string} amount - 新金额
 * @param {string} category - 新类别
 * @param {string} note - 新备注
 */
function modifyExpense(id, amount, category, note) {
  const start = Date.now();

  try {
    const data = loadData();
    const expense = data.expenses.find(e => e.id === parseInt(id));

    if (!expense) {
      console.log(`[ERROR] 未找到ID=${id}的记录`);
      return;
    }

    if (amount && amount !== '0') expense.amount = parseFloat(amount);
    if (category && CATEGORIES.includes(category)) expense.category = category;
    if (note) expense.note = note;

    saveData(data);
    console.log(`[OK] 已修改：ID=${expense.id} -> ${expense.amount.toFixed(2)} [${expense.category}] ${expense.note}`);
    logTelemetry('modify', `id=${id}, amount=${amount}, category=${category}`, '', Date.now() - start);
  } catch (error) {
    logTelemetry('modify', `id=${id}`, error.message, Date.now() - start);
    console.log(`[ERROR] ${error.message}`);
  }
}

/**
 * 列出最近N天的消费记录
 * @param {number} days - 天数
 */
function listExpenses(days = 7) {
  const start = Date.now();

  try {
    const data = loadData();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const filtered = data.expenses.filter(e => e.date >= cutoffStr);

    if (filtered.length === 0) {
      console.log(`最近${days}天无记录`);
      return;
    }

    console.log('\nID  日期                 金额  类别     备注');
    console.log('--------------------------------------------------');

    let total = 0;
    const sorted = filtered.sort((a, b) => b.date.localeCompare(a.date));

    for (const e of sorted) {
      console.log(`${String(e.id).padStart(3)} ${e.date}   ¥${e.amount.toFixed(2).padStart(7)} ${e.category.padEnd(6)} ${e.note}`);
      total += e.amount;
    }

    console.log('--------------------------------------------------');
    console.log(`合计           ¥${total.toFixed(2)}  (${filtered.length}笔)`);
    logTelemetry('list', `days=${days}, count=${filtered.length}`, '', Date.now() - start);
  } catch (error) {
    logTelemetry('list', `days=${days}`, error.message, Date.now() - start);
    console.log(`[ERROR] ${error.message}`);
  }
}

/**
 * 显示某日消费汇总
 * @param {?string} targetDate - 目标日期
 */
function dailySummary(targetDate = null) {
  const start = Date.now();

  try {
    const data = loadData();
    const date = targetDate || new Date().toISOString().split('T')[0];
    const dayExpenses = data.expenses.filter(e => e.date === date);

    if (dayExpenses.length === 0) {
      console.log(`${date} 无记录`);
      return;
    }

    const total = dayExpenses.reduce((sum, e) => sum + e.amount, 0);

    console.log(`\n ${date} 消费汇总\n${'='.repeat(40)}`);
    console.log(`  总笔数：${dayExpenses.length}`);
    console.log(`  总金额：¥${total.toFixed(2)}\n`);

    const catMap = {};
    for (const e of dayExpenses) {
      catMap[e.category] = (catMap[e.category] || 0) + e.amount;
    }

    const maxAmount = Math.max(...Object.values(catMap));
    console.log('  分类统计：');

    for (const [cat, amount] of Object.entries(catMap).sort((a, b) => b[1] - a[1])) {
      const barLen = Math.round((amount / maxAmount) * 20);
      const bar = '█'.repeat(barLen);
      const pct = ((amount / total) * 100).toFixed(1);
      console.log(`    ${cat.padEnd(6)} ¥${amount.toFixed(2).padStart(7)}  ${bar} (${pct}%)`);
    }

    logTelemetry('summary', `date=${date}, total=${total.toFixed(2)}`, '', Date.now() - start);
  } catch (error) {
    logTelemetry('summary', `date=${targetDate}`, error.message, Date.now() - start);
    console.log(`[ERROR] ${error.message}`);
  }
}

/**
 * 显示近7天消费报告
 */
function weeklyReport() {
  const start = Date.now();

  try {
    const data = loadData();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const weekExpenses = data.expenses.filter(e => e.date >= cutoffStr);

    if (weekExpenses.length === 0) {
      console.log('最近7天无记录');
      return;
    }

    const total = weekExpenses.reduce((sum, e) => sum + e.amount, 0);

    console.log(`\n📈 近7天消费报告\n${'='.repeat(40)}`);
    console.log(`  总支出：¥${total.toFixed(2)}`);
    console.log(`  日均：  ¥${(total / 7).toFixed(2)}`);
    console.log(`  笔数：  ${weekExpenses.length}\n`);

    const catTotals = {};
    for (const e of weekExpenses) {
      catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
    }

    console.log('  分类占比：');
    for (const [cat, amount] of Object.entries(catTotals).sort((a, b) => b[1] - a[1])) {
      const pct = ((amount / total) * 100).toFixed(1);
      console.log(`    ${cat.padEnd(6)} ¥${amount.toFixed(2).padStart(7)}  (${pct}%)`);
    }

    logTelemetry('weekly_report', `total=${total.toFixed(2)}`, '', Date.now() - start);
  } catch (error) {
    logTelemetry('weekly_report', '', error.message, Date.now() - start);
    console.log(`[ERROR] ${error.message}`);
  }
}

/**
 * 显示消费趋势图
 * @param {number} days - 天数
 */
function showTrend(days = 7) {
  const start = Date.now();

  try {
    const data = loadData();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const filtered = data.expenses.filter(e => e.date >= cutoffStr);

    if (filtered.length === 0) {
      console.log(`最近${days}天无记录`);
      return;
    }

    const dailyMap = {};
    for (const e of filtered) {
      dailyMap[e.date] = (dailyMap[e.date] || 0) + e.amount;
    }

    const dates = Object.keys(dailyMap).sort();
    const maxVal = Math.max(...Object.values(dailyMap));

    console.log(`\n📈 近${days}天消费趋势图\n${'='.repeat(50)}`);

    const unit = Math.max(1, Math.round(maxVal / 20));
    console.log(`  单位：¥1 = ${unit}元\n`);

    for (const date of dates) {
      const val = dailyMap[date];
      const barLen = Math.round(val / unit);
      const bar = '█'.repeat(barLen);
      const dayLabel = date.slice(5);
      console.log(`  ${dayLabel} | ${bar} ¥${val.toFixed(2).padStart(7)}`);
    }

    const total = Object.values(dailyMap).reduce((s, v) => s + v, 0);
    const avg = total / dates.length;
    console.log(`\n  总计：¥${total.toFixed(2)}  日均：¥${avg.toFixed(2)}  共${dates.length}天`);

    logTelemetry('trend', `days=${days}, total=${total.toFixed(2)}`, '', Date.now() - start);
  } catch (error) {
    logTelemetry('trend', `days=${days}`, error.message, Date.now() - start);
    console.log(`[ERROR] ${error.message}`);
  }
}

// ============================================================================
// 预算管理
// ============================================================================

/**
 * 设置月度预算
 * @param {string} amount - 预算金额
 */
function setBudget(amount) {
  const start = Date.now();

  try {
    const budget = { monthly: parseFloat(amount) };
    saveBudget(budget);
    console.log(`[OK] 月度预算已设置为：¥${amount}`);
    checkBudget();
    logTelemetry('set_budget', `amount=${amount}`, '', Date.now() - start);
  } catch (error) {
    logTelemetry('set_budget', `amount=${amount}`, error.message, Date.now() - start);
    console.log(`[ERROR] ${error.message}`);
  }
}

/**
 * 显示当前预算状态
 */
function showBudget() {
  const start = Date.now();

  try {
    const budget = loadBudget();

    if (budget.monthly === 0) {
      console.log('尚未设置月度预算');
      console.log('用法：node main.js budget <金额>');
      return;
    }

    const data = loadData();
    const thisMonth = new Date().toISOString().slice(0, 7);
    const monthExpenses = data.expenses.filter(e => e.date.startsWith(thisMonth));
    const spent = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const pct = ((spent / budget.monthly) * 100).toFixed(1);
    const remaining = budget.monthly - spent;

    console.log(`\n💰 月度预算\n${'='.repeat(40)}`);
    console.log(`  预算：  ¥${budget.monthly.toFixed(2)}`);
    console.log(`  已支出：¥${spent.toFixed(2)} (${pct}%)`);
    console.log(`  剩余：  ¥${remaining.toFixed(2)}`);

    if (spent >= budget.monthly) {
      console.log(`\n⚠️  已超支 ¥${Math.abs(remaining).toFixed(2)}！`);
    } else if (pct >= 80) {
      console.log(`\n⚠️  即将超支，请注意控制消费！`);
    }

    logTelemetry('show_budget', `monthly=${budget.monthly}, spent=${spent.toFixed(2)}`, '', Date.now() - start);
  } catch (error) {
    logTelemetry('show_budget', '', error.message, Date.now() - start);
    console.log(`[ERROR] ${error.message}`);
  }
}

/**
 * 检查预算状态并显示警告
 */
function checkBudget() {
  const budget = loadBudget();
  if (budget.monthly === 0) return;

  const data = loadData();
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthExpenses = data.expenses.filter(e => e.date.startsWith(thisMonth));
  const spent = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const pct = (spent / budget.monthly) * 100;

  if (pct >= 100) {
    console.log(`\n⚠️  预算警告：已超支 ¥${(spent - budget.monthly).toFixed(2)} (${pct.toFixed(1)}%)`);
  } else if (pct >= 80) {
    console.log(`\n⚠️  预算提醒：已使用 ${pct.toFixed(1)}%，剩余 ¥${(budget.monthly - spent).toFixed(2)}`);
  }
}

// ============================================================================
// 导出功能
// ============================================================================

/**
 * 导出消费数据为CSV
 */
function exportCSV() {
  const start = Date.now();

  try {
    const data = loadData();
    const csvFile = path.join(process.env.USERPROFILE, 'Desktop', 'expenses_export.csv');

    let csv = '\uFEFF日期，金额，类别，备注，记录时间\n';
    for (const e of data.expenses) {
      csv += `${e.date},${e.amount},${e.category},${e.note},${e.created_at}\n`;
    }

    fs.writeFileSync(csvFile, csv, 'utf-8');
    console.log(`[OK] 已导出到 ${csvFile}`);
    logTelemetry('export_csv', `count=${data.expenses.length}`, '', Date.now() - start);
  } catch (error) {
    logTelemetry('export_csv', '', error.message, Date.now() - start);
    console.log(`[ERROR] ${error.message}`);
  }
}

// ============================================================================
// 查询功能
// ============================================================================

/**
 * 显示运行日志
 */
function showLogs() {
  const start = Date.now();

  try {
    const logFiles = fs.readdirSync(LOG_DIR)
      .filter(f => f.endsWith('.json'))
      .sort();

    if (logFiles.length === 0) {
      console.log('暂无运行日志');
      return;
    }

    console.log(`\n📋 Telemetry 运行日志\n${'='.repeat(50)}`);

    for (const file of logFiles) {
      const logs = JSON.parse(fs.readFileSync(path.join(LOG_DIR, file), 'utf-8'));
      const date = file.replace('log_', '').replace('.json', '');

      console.log(`\n【${date}】共 ${logs.length} 条记录`);
      for (const e of logs) {
        const errTag = e.error ? ` [ERROR: ${e.error}]` : '';
        console.log(`  ${e.timestamp} | ${e.action.padEnd(14)} | 耗时${String(e.elapsed_ms).padStart(3)}ms | 第${e.call_count}次调用${errTag}`);
      }
    }

    logTelemetry('show_logs', `files=${logFiles.length}`, '', Date.now() - start);
  } catch (error) {
    logTelemetry('show_logs', '', error.message, Date.now() - start);
    console.log(`[ERROR] ${error.message}`);
  }
}

/**
 * 显示用户反馈
 */
function showFeedback() {
  const start = Date.now();

  try {
    if (fs.existsSync(FEEDBACK_FILE)) {
      const content = fs.readFileSync(FEEDBACK_FILE, 'utf-8');
      console.log(content);
    } else {
      console.log('未找到用户反馈文件');
    }
    logTelemetry('show_feedback', '', '', Date.now() - start);
  } catch (error) {
    logTelemetry('show_feedback', '', error.message, Date.now() - start);
    console.log(`[ERROR] ${error.message}`);
  }
}

/**
 * 显示消费数据概览
 */
function showData() {
  const start = Date.now();

  try {
    const data = loadData();

    console.log(`\n📊 消费数据概览\n${'='.repeat(50)}`);
    console.log(`  总笔数：${data.expenses.length}`);

    if (data.expenses.length > 0) {
      console.log(`  日期范围：${data.expenses[0].date} ~ ${data.expenses[data.expenses.length - 1].date}`);
      const total = data.expenses.reduce((sum, e) => sum + e.amount, 0);
      console.log(`  总金额：¥${total.toFixed(2)}`);
    }

    logTelemetry('show_data', `count=${data.expenses.length}`, '', Date.now() - start);
  } catch (error) {
    logTelemetry('show_data', '', error.message, Date.now() - start);
    console.log(`[ERROR] ${error.message}`);
  }
}

// ============================================================================
// 交互菜单
// ============================================================================

/**
 * 创建 readline 接口
 * @return {readline.Interface} readline 接口
 */
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * 询问用户输入
 * @param {readline.Interface} rl - readline 接口
 * @param {string} question - 问题
 * @return {Promise<string>} 用户输入
 */
function ask(rl, question) {
  return new Promise(resolve => rl.question(question, resolve));
}

/**
 * 运行交互菜单
 */
async function runMenu() {
  const rl = createReadlineInterface();

  while (true) {
    console.log('\n============================');
    console.log('  校园生活费记账工具 v3.0');
    console.log('============================');
    console.log('  1. 记一笔账      2. 批量记账      3. 查看最近记录');
    console.log('  4. 今日汇总      5. 近7天报告      6. 消费趋势图');
    console.log('  7. 预算管理      8. 删除记录      9. 修改记录');
    console.log('  A. 导出CSV      B. 查看日志      C. 用户反馈');
    console.log('  D. 查看数据      0. 退出');
    console.log('');

    const choice = (await ask(rl, '请输入数字或字母：')).trim().toUpperCase();

    if (choice === '1') {
      const amount = (await ask(rl, '金额（元）：')).trim();
      console.log('类别：1餐饮 2交通 3购物 4娱乐 5学习 6医疗 7其他');
      const catNum = (await ask(rl, '选数字：')).trim();
      const note = (await ask(rl, '备注（直接回车跳过）：')).trim();
      const useDate = (await ask(rl, '是否补记？(y/n，直接回车=n)：')).trim().toLowerCase();

      let targetDate = null;
      if (useDate === 'y') {
        targetDate = (await ask(rl, '日期（YYYY-MM-DD）：')).trim();
      }

      const cats = { '1': '餐饮', '2': '交通', '3': '购物', '4': '娱乐', '5': '学习', '6': '医疗', '7': '其他' };
      addExpense(amount, cats[catNum] || '其他', note, targetDate);

    } else if (choice === '2') {
      console.log('格式：金额，类别，备注|金额，类别，备注');
      console.log('示例：3,餐饮，早餐|13,餐饮，午餐|8,娱乐，奶茶');
      const input = (await ask(rl, '请输入：')).trim();
      batchAdd(input);

    } else if (choice === '3') {
      const days = (await ask(rl, '查看几天？(直接回车=7)：')).trim();
      listExpenses(parseInt(days) || 7);

    } else if (choice === '4') {
      const date = (await ask(rl, '日期？(直接回车=今天，格式YYYY-MM-DD)：')).trim();
      dailySummary(date || null);

    } else if (choice === '5') {
      weeklyReport();

    } else if (choice === '6') {
      const days = (await ask(rl, '几天趋势？(直接回车=7)：')).trim();
      showTrend(parseInt(days) || 7);

    } else if (choice === '7') {
      const sub = (await ask(rl, '1.查看预算  2.设置预算：')).trim();
      if (sub === '2') {
        const amt = (await ask(rl, '月度预算金额（元）：')).trim();
        setBudget(amt);
      } else {
        showBudget();
      }

    } else if (choice === '8') {
      listExpenses(30);
      const id = (await ask(rl, '要删除的记录ID：')).trim();
      if (id) deleteExpense(id);

    } else if (choice === '9') {
      listExpenses(30);
      const id = (await ask(rl, '要修改的记录ID：')).trim();
      const amount = (await ask(rl, '新金额（直接回车=不变）：')).trim();
      const cat = (await ask(rl, '新类别（直接回车=不变）：')).trim();
      const note = (await ask(rl, '新备注（直接回车=不变）：')).trim();
      if (id) modifyExpense(id, amount || '0', cat || '其他', note || '');

    } else if (choice === 'A') {
      exportCSV();

    } else if (choice === 'B') {
      showLogs();

    } else if (choice === 'C') {
      showFeedback();

    } else if (choice === 'D') {
      showData();

    } else if (choice === '0') {
      console.log('再见！');
      rl.close();
      process.exit(0);

    } else {
      console.log('无效输入，请重试');
    }
  }
}

// ============================================================================
// 帮助信息
// ============================================================================

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(`
校园生活费记账工具 v3.0
========================

用法：node main.js <命令> [参数]

命令：
  add <金额> <类别> [备注] [日期]  记一笔账
  batch "金额,类别,备注|..."       批量记账
  delete <ID>                      删除记录
  modify <ID> <金额> <类别> [备注] 修改记录
  list [天数]                      查看记录
  summary [日期]                   日汇总
  weekly                           周报
  trend [天数]                     趋势图
  budget [金额]                    预算管理
  export                           导出CSV
  logs                             运行日志
  feedback                         用户反馈
  data                             数据概览
  menu                             交互菜单
  help                             显示帮助

类别：餐饮 交通 购物 娱乐 学习 医疗 其他
`);
}

// ============================================================================
// 主程序入口
// ============================================================================

/**
 * 主函数
 */
function main() {
  ensureDirs();

  const args = process.argv.slice(2);
  logTelemetry('startup', `args=${args.join(',')}`, '');

  if (args.length === 0) {
    showHelp();
    return;
  }

  const cmd = args[0].toLowerCase();

  switch (cmd) {
    case 'add':
      if (args.length < 3) {
        console.log('用法：node main.js add <金额> <类别> [备注] [日期]');
        return;
      }
      addExpense(args[1], args[2], args[3] || '', args[4] || null);
      break;

    case 'batch':
      if (args.length < 2) {
        console.log('用法：node main.js batch "金额,类别,备注|..."');
        return;
      }
      batchAdd(args[1]);
      break;

    case 'delete':
      if (args.length < 2) {
        console.log('用法：node main.js delete <ID>');
        return;
      }
      deleteExpense(args[1]);
      break;

    case 'modify':
      if (args.length < 4) {
        console.log('用法：node main.js modify <ID> <金额> <类别> [备注]');
        return;
      }
      modifyExpense(args[1], args[2], args[3], args[4] || '');
      break;

    case 'list':
      listExpenses(parseInt(args[1]) || 7);
      break;

    case 'summary':
      dailySummary(args[1] || null);
      break;

    case 'weekly':
      weeklyReport();
      break;

    case 'trend':
      showTrend(parseInt(args[1]) || 7);
      break;

    case 'budget':
      if (args[1]) {
        setBudget(args[1]);
      } else {
        showBudget();
      }
      break;

    case 'export':
      exportCSV();
      break;

    case 'logs':
      showLogs();
      break;

    case 'feedback':
      showFeedback();
      break;

    case 'data':
      showData();
      break;

    case 'menu':
      runMenu();
      break;

    case 'help':
      showHelp();
      break;

    default:
      console.log(`未知命令：${cmd}，输入 help 查看帮助`);
  }
}

// 启动程序
main();
