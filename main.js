const fs = require('fs');
const path = require('path');

const BASE_DIR = __dirname;
const DATA_DIR = path.join(BASE_DIR, 'data');
const LOG_DIR = path.join(BASE_DIR, 'process_logs');
const DATA_FILE = path.join(DATA_DIR, 'expenses.json');
const CATEGORIES = ['餐饮', '交通', '购物', '娱乐', '学习', '医疗', '其他'];

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

function loadData() {
  if (fs.existsSync(DATA_FILE)) {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  }
  return { expenses: [], version: 1 };
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function logTelemetry(action, details = '', error = '') {
  ensureDirs();
  const today = new Date().toISOString().split('T')[0];
  const logFile = path.join(LOG_DIR, `telemetry_${today}.log`);
  const entry = {
    timestamp: new Date().toLocaleString('zh-CN', { hour12: false }),
    action,
    details,
    error,
  };
  fs.appendFileSync(logFile, JSON.stringify(entry) + '\n', 'utf-8');
}

function addExpense(amount, category, note = '') {
  const start = Date.now();
  try {
    if (!CATEGORIES.includes(category)) {
      throw new Error(`无效类别: ${category}，可选: ${CATEGORIES.join(', ')}`);
    }
    amount = parseFloat(amount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('金额必须大于0');
    }

    const data = loadData();
    const today = new Date().toISOString().split('T')[0];
    const entry = {
      id: data.expenses.length + 1,
      amount,
      category,
      note,
      date: today,
      created_at: new Date().toLocaleString('zh-CN', { hour12: false }),
    };
    data.expenses.push(entry);
    saveData(data);

    const elapsed = Date.now() - start;
    logTelemetry('add', `amount=${amount}, category=${category}`, '');
    console.log(`[OK] 已记录: ¥${amount.toFixed(2)} [${category}] ${note}  (耗时 ${elapsed}ms)`);
  } catch (e) {
    logTelemetry('add', `amount=${amount}, category=${category}`, e.message);
    console.log(`[ERROR] ${e.message}`);
  }
}

function listExpenses(days = 7) {
  const start = Date.now();
  try {
    const data = loadData();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const filtered = data.expenses
      .filter(e => e.date >= cutoffStr)
      .sort((a, b) => b.date.localeCompare(a.date));

    if (filtered.length === 0) {
      console.log(`最近${days}天无记录`);
      return;
    }

    console.log(`\n${'日期'.padEnd(12)} ${'金额'.padStart(8)} ${'类别'.padEnd(6)} 备注`);
    console.log('-'.repeat(50));
    let total = 0;
    for (const e of filtered) {
      console.log(`${e.date.padEnd(12)} ¥${e.amount.toFixed(2).padStart(7)} ${e.category.padEnd(6)} ${e.note}`);
      total += e.amount;
    }
    console.log('-'.repeat(50));
    console.log(`${'合计'.padEnd(12)} ¥${total.toFixed(2).padStart(7)}  (${filtered.length}笔)`);

    logTelemetry('list', `days=${days}, count=${filtered.length}`, '');
  } catch (e) {
    logTelemetry('list', `days=${days}`, e.message);
    console.log(`[ERROR] ${e.message}`);
  }
}

function dailySummary(targetDate = null) {
  const start = Date.now();
  try {
    const data = loadData();
    if (!targetDate) {
      targetDate = new Date().toISOString().split('T')[0];
    }

    const dayExpenses = data.expenses.filter(e => e.date === targetDate);

    if (dayExpenses.length === 0) {
      console.log(`${targetDate} 无记录`);
      return;
    }

    const total = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
    console.log(`\n📅 ${targetDate} 消费汇总`);
    console.log('='.repeat(40));

    const catTotals = {};
    for (const e of dayExpenses) {
      catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
    }

    const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
    for (const [cat, amount] of sorted) {
      const pct = (amount / total * 100).toFixed(1);
      const bar = '█'.repeat(Math.floor(pct / 5));
      console.log(`  ${cat.padEnd(6)} ¥${amount.toFixed(2).padStart(7)}  ${pct.padStart(5)}% ${bar}`);
    }

    console.log(`\n  总计: ¥${total.toFixed(2)}  (${dayExpenses.length}笔)`);

    logTelemetry('summary', `date=${targetDate}`, '');
  } catch (e) {
    logTelemetry('summary', `date=${targetDate}`, e.message);
    console.log(`[ERROR] ${e.message}`);
  }
}

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
    const dailyAvg = total / 7;

    console.log(`\n📊 近7天消费报告`);
    console.log('='.repeat(50));
    console.log(`  总支出: ¥${total.toFixed(2)}`);
    console.log(`  日均:   ¥${dailyAvg.toFixed(2)}`);
    console.log(`  笔数:   ${weekExpenses.length}`);

    const catTotals = {};
    for (const e of weekExpenses) {
      catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
    }

    console.log(`\n  分类占比:`);
    const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
    for (const [cat, amount] of sorted) {
      const pct = (amount / total * 100).toFixed(1);
      console.log(`    ${cat.padEnd(6)} ¥${amount.toFixed(2).padStart(7)}  (${pct}%)`);
    }

    logTelemetry('weekly_report', `total=${total.toFixed(2)}`, '');
  } catch (e) {
    logTelemetry('weekly_report', '', e.message);
    console.log(`[ERROR] ${e.message}`);
  }
}

function exportCSV() {
  const start = Date.now();
  try {
    const data = loadData();
    const csvFile = path.join(DATA_DIR, 'expenses_export.csv');
    let csv = '\uFEFF日期,金额,类别,备注,记录时间\n';
    for (const e of data.expenses) {
      csv += `${e.date},${e.amount},${e.category},${e.note},${e.created_at}\n`;
    }
    fs.writeFileSync(csvFile, csv, 'utf-8');
    console.log(`[OK] 已导出到 ${csvFile}`);
    logTelemetry('export_csv', `count=${data.expenses.length}`, '');
  } catch (e) {
    logTelemetry('export_csv', '', e.message);
    console.log(`[ERROR] ${e.message}`);
  }
}

function showHelp() {
  console.log(`
校园生活费记账工具 v1.0
========================
用法: node main.js <命令> [参数]

命令:
  add <金额> <类别> [备注]   记一笔账
    类别: 餐饮 交通 购物 娱乐 学习 医疗 其他
    示例: node main.js add 15 餐饮 午餐

  list [天数]                查看最近N天记录 (默认7天)

  summary [日期]             查看某日汇总 (默认今天)
    示例: node main.js summary 2026-10-21

  weekly                     查看近7天报告

  export                     导出CSV (可用WPS打开)

  help                       显示帮助
`);
}

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
        console.log('用法: node main.js add <金额> <类别> [备注]');
        return;
      }
      addExpense(args[1], args[2], args[3] || '');
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
    case 'export':
      exportCSV();
      break;
    case 'help':
      showHelp();
      break;
    default:
      console.log(`未知命令: ${cmd}`);
      showHelp();
  }
}

main();
