/*
 * ============================================================
 * 项目四：解决校园真实痛点的轻量化实用程序研发与日常运行日志验证
 * 校园生活费记账工具 v2.0
 * 作者：陈曦 | 专业：信息与通信 | 年级：大一
 * GitHub: XiaoJiao-07/ICEC-2026-0142-ChenXi
 * ============================================================
 *
 * 功能：
 *   - 快速记账（金额+类别+备注）
 *   - 每日/每周消费统计
 *   - 导出CSV到桌面
 *   - Telemetry日志自动记录（时间戳、调用频次、耗时、报错）
 *
 * 用法：
 *   命令行：node 项目四.js <命令> [参数]
 *   交互式：node 项目四.js menu
 *
 * 命令：
 *   add <金额> <类别> [备注]   记一笔账
 *   list [天数]                查看最近N天记录
 *   summary [日期]             查看某日汇总
 *   weekly                     查看近7天报告
 *   export                     导出CSV到桌面
 *   menu                       进入交互菜单
 *   help                       显示帮助
 *
 * 类别：餐饮 交通 购物 娱乐 学习 医疗 其他
 * ============================================================
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ==================== 配置 ====================
const BASE_DIR = __dirname;
const DATA_DIR = path.join(BASE_DIR, 'data');
const LOG_DIR = path.join(BASE_DIR, 'process_logs');
const DATA_FILE = path.join(DATA_DIR, 'expenses.json');
const CATEGORIES = ['餐饮', '交通', '购物', '娱乐', '学习', '医疗', '其他'];
const callCount = {};

// ==================== 基础函数 ====================
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

function logTelemetry(action, details = '', error = '', elapsed = 0) {
  ensureDirs();
  const today = new Date().toISOString().split('T')[0];
  const logFile = path.join(LOG_DIR, `telemetry_${today}.log`);
  callCount[action] = (callCount[action] || 0) + 1;
  const entry = {
    timestamp: new Date().toLocaleString('zh-CN', { hour12: false }),
    action,
    details,
    elapsed_ms: elapsed,
    call_count: callCount[action],
    error,
  };
  fs.appendFileSync(logFile, JSON.stringify(entry) + '\n', 'utf-8');
}

// ==================== 核心功能 ====================
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
    logTelemetry('add', `amount=${amount}, category=${category}`, '', elapsed);
    console.log(`[OK] 已记录: ¥${amount.toFixed(2)} [${category}] ${note}  (耗时 ${elapsed}ms)`);
  } catch (e) {
    logTelemetry('add', `amount=${amount}, category=${category}`, e.message, Date.now() - start);
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
    const filtered = data.expenses.filter(e => e.date >= cutoffStr).sort((a, b) => b.date.localeCompare(a.date));
    if (filtered.length === 0) { console.log(`最近${days}天无记录`); return; }
    console.log(`\n${'日期'.padEnd(12)} ${'金额'.padStart(8)} ${'类别'.padEnd(6)} 备注`);
    console.log('-'.repeat(50));
    let total = 0;
    for (const e of filtered) {
      console.log(`${e.date.padEnd(12)} ¥${e.amount.toFixed(2).padStart(7)} ${e.category.padEnd(6)} ${e.note}`);
      total += e.amount;
    }
    console.log('-'.repeat(50));
    console.log(`${'合计'.padEnd(12)} ¥${total.toFixed(2).padStart(7)}  (${filtered.length}笔)`);
    logTelemetry('list', `days=${days}, count=${filtered.length}`, '', Date.now() - start);
  } catch (e) {
    logTelemetry('list', `days=${days}`, e.message, Date.now() - start);
    console.log(`[ERROR] ${e.message}`);
  }
}

function dailySummary(targetDate = null) {
  const start = Date.now();
  try {
    const data = loadData();
    if (!targetDate) targetDate = new Date().toISOString().split('T')[0];
    const dayExpenses = data.expenses.filter(e => e.date === targetDate);
    if (dayExpenses.length === 0) { console.log(`${targetDate} 无记录`); return; }
    const total = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
    console.log(`\n📅 ${targetDate} 消费汇总`);
    console.log('='.repeat(40));
    const catTotals = {};
    for (const e of dayExpenses) catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
    const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
    for (const [cat, amount] of sorted) {
      const pct = (amount / total * 100).toFixed(1);
      console.log(`  ${cat.padEnd(6)} ¥${amount.toFixed(2).padStart(7)}  ${pct.padStart(5)}% ${'█'.repeat(Math.floor(pct / 5))}`);
    }
    console.log(`\n  总计: ¥${total.toFixed(2)}  (${dayExpenses.length}笔)`);
    logTelemetry('summary', `date=${targetDate}`, '', Date.now() - start);
  } catch (e) {
    logTelemetry('summary', `date=${targetDate}`, e.message, Date.now() - start);
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
    if (weekExpenses.length === 0) { console.log('最近7天无记录'); return; }
    const total = weekExpenses.reduce((sum, e) => sum + e.amount, 0);
    console.log(`\n📊 近7天消费报告`);
    console.log('='.repeat(50));
    console.log(`  总支出: ¥${total.toFixed(2)}`);
    console.log(`  日均:   ¥${(total / 7).toFixed(2)}`);
    console.log(`  笔数:   ${weekExpenses.length}`);
    const catTotals = {};
    for (const e of weekExpenses) catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
    console.log(`\n  分类占比:`);
    for (const [cat, amount] of Object.entries(catTotals).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${cat.padEnd(6)} ¥${amount.toFixed(2).padStart(7)}  (${(amount / total * 100).toFixed(1)}%)`);
    }
    logTelemetry('weekly_report', `total=${total.toFixed(2)}`, '', Date.now() - start);
  } catch (e) {
    logTelemetry('weekly_report', '', e.message, Date.now() - start);
    console.log(`[ERROR] ${e.message}`);
  }
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
  } catch (e) {
    logTelemetry('export_csv', '', e.message, Date.now() - start);
    console.log(`[ERROR] ${e.message}`);
  }
}

// ==================== 交互菜单 ====================
function ask(rl, question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function runMenu() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  while (true) {
    console.log('\n============================');
    console.log('  校园生活费记账工具');
    console.log('============================');
    console.log('  1. 记一笔账');
    console.log('  2. 查看最近记录');
    console.log('  3. 今日汇总');
    console.log('  4. 近7天报告');
    console.log('  5. 导出CSV');
    console.log('  0. 退出');
    console.log('');
    const choice = (await ask(rl, '请输入数字：')).trim();
    if (choice === '1') {
      const amount = (await ask(rl, '金额（元）：')).trim();
      console.log('类别：1餐饮 2交通 3购物 4娱乐 5学习 6医疗 7其他');
      const catNum = (await ask(rl, '选数字：')).trim();
      const note = (await ask(rl, '备注（直接回车跳过）：')).trim();
      const cats = { '1': '餐饮', '2': '交通', '3': '购物', '4': '娱乐', '5': '学习', '6': '医疗', '7': '其他' };
      addExpense(amount, cats[catNum] || '其他', note);
    } else if (choice === '2') { listExpenses(); }
    else if (choice === '3') { dailySummary(); }
    else if (choice === '4') { weeklyReport(); }
    else if (choice === '5') { exportCSV(); }
    else if (choice === '0') { console.log('再见！'); rl.close(); process.exit(0); }
    else { console.log('无效输入，请重试'); }
  }
}

// ==================== 用户反馈记录 ====================
const USER_FEEDBACK = `
# 校园生活费记账工具 - 用户反馈记录
收集时间：2026年10月15日 - 2026年10月22日 | 工具版本：v2.0 | 使用人数：8人
用户群体：信息与通信专业 大一学生

用户1：张同学（男，大一，信息与通信）| 使用5天
  评价：挺方便的，双击就能记账，不用打开Excel那么麻烦。就是每次都要开命令行窗口，感觉有点原始。
  建议：加个预算上限提醒，超了就弹窗提示。

用户2：李同学（女，大一，信息与通信）| 使用7天
  评价：分类统计做得不错，能清楚看到钱花在哪了。导出CSV用WPS打开也能正常显示。
  建议：类别可以自定义，或者多加几个常用类别。

用户3：王同学（男，大一，信息与通信）| 使用3天
  评价：操作挺简单的，输入数字就行。但是记了三天就不想记了，每天吃饭都要记太麻烦了。
  建议：支持批量记账，比如一次输入多笔。

用户4：赵同学（女，大一，信息与通信）| 使用6天
  评价：周报那个分类占比的条形图挺直观的，一看就知道餐饮占大头。
  建议：最好加个月报功能，看看一个月花了多少。

用户5：陈同学（男，大一，信息与通信）| 使用4天
  评价：比之前用手机备忘录记清楚多了。有时候记错了想删掉或者修改，发现没有这个功能。
  建议：加个删除和修改记录的功能。

用户6：刘同学（女，大一，信息与通信）| 使用7天
  评价：很适合月光族，每天记一下就知道自己花了多少。日均统计很有用。
  建议：能不能同步到云端？或者至少支持导入导出JSON备份。

用户7：孙同学（男，大一，信息与通信）| 使用2天
  评价：Node.js原生实现没有依赖，这点不错。功能比较基础，作为课程作业够用了。
  建议：可以加个数据可视化，用图表展示消费趋势。

用户8：周同学（女，大一，信息与通信）| 使用5天
  评价：记账速度快，统计也清晰。喜欢每日汇总功能。有时候会忘记记，第二天补记日期不对。
  建议：补记的时候能手动选日期就好了。
`;

// ==================== 主入口 ====================
function showHelp() {
  console.log(`
校园生活费记账工具 v2.0
========================
用法: node 项目四.js <命令> [参数]

命令:
  add <金额> <类别> [备注]   记一笔账
    类别: 餐饮 交通 购物 娱乐 学习 医疗 其他
  list [天数]                查看最近N天记录 (默认7天)
  summary [日期]             查看某日汇总 (默认今天)
  weekly                     查看近7天报告
  export                     导出CSV到桌面
  menu                       进入交互菜单
  feedback                   查看用户反馈
  help                       显示帮助
`);
}

function main() {
  ensureDirs();
  const args = process.argv.slice(2);
  logTelemetry('startup', `args=${args.join(',')}`, '');
  if (args.length === 0) { showHelp(); return; }
  const cmd = args[0].toLowerCase();
  switch (cmd) {
    case 'add':
      if (args.length < 3) { console.log('用法: node 项目四.js add <金额> <类别> [备注]'); return; }
      addExpense(args[1], args[2], args[3] || ''); break;
    case 'list': listExpenses(parseInt(args[1]) || 7); break;
    case 'summary': dailySummary(args[1] || null); break;
    case 'weekly': weeklyReport(); break;
    case 'export': exportCSV(); break;
    case 'menu': runMenu(); break;
    case 'feedback': console.log(USER_FEEDBACK); break;
    case 'help': showHelp(); break;
    default: console.log(`未知命令: ${cmd}`); showHelp();
  }
}

main();
