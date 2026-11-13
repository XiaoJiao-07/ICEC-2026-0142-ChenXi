/*
 * ============================================================
 * app.js - 校园生活费记账工具 交互菜单 + CLI入口
 * 项目四：解决校园真实痛点的轻量化实用程序研发与日常运行日志验证
 * 作者：陈曦 | 大一 | 信息与通信
 * GitHub: XiaoJiao-07/ICEC-2026-0142-ChenXi
 * ============================================================
 *
 * 用法：
 *   node app.js <命令> [参数]
 *   node app.js menu          进入交互菜单
 *
 * 命令：
 *   add <金额> <类别> [备注]   记一笔账
 *   batch <金额,类别,备注|...>  批量记账（多条用|分隔）
 *   delete <ID>                删除某条记录
 *   modify <ID> <金额> <类别> [备注]  修改某条记录
 *   list [天数]                查看最近N天记录
 *   summary [日期]             查看某日汇总
 *   weekly                     查看近7天报告
 *   export                     导出CSV到桌面
 *   logs                       查看Telemetry日志
 *   data                       查看消费数据
 *   menu                       进入交互菜单
 *   help                       显示帮助
 *
 * 类别：餐饮 交通 购物 娱乐 学习 医疗 其他
 * ============================================================
 */

const { ensureDirs, loadData, logTelemetry, addExpense, batchAdd, deleteExpense, modifyExpense, listExpenses,
  dailySummary, weeklyReport, exportCSV, showLogs, showData, setBudget, checkBudget, trendChart, addExpenseWithDate,
  monthlyReport, checkAnomaly, backupData, restoreData } = require('./main');
const readline = require('readline');

// ==================== 用户反馈（读取 feedback_raw/ 的真实记录） ====================
/*
 * 2026-11-12 修改记录：
 * 此处原有一段硬编码的 USER_FEEDBACK 常量，装着 8 条"大一信息与通信同学"的反馈。
 * 那 8 条的来源无法被第三方核验（详见根目录 CORRECTION.md 与 user_feedback.md 末尾的说明），
 * 把未经核验的反馈当作程序功能展示，会让使用者误以为这些评价是真的。
 * 现改为读取 feedback_raw/ 目录：每收一位真实用户，就往该目录放一份 .md（含日期、原话、截图文件名）。
 * 没有真实记录时如实显示"还没有"，不用任何预置内容填充。
 */
const fsp = require('fs');
const pathp = require('path');

function showFeedback() {
  const dir = pathp.join(__dirname, 'feedback_raw');
  console.log('\n 真实用户反馈（feedback_raw/）\n' + '='.repeat(50));
  const empty = '\n 还没有任何真实用户记录。每收一位用户，就往 feedback_raw/ 放一份 .md。';
  if (!fsp.existsSync(dir)) { console.log(empty); return; }
  const files = fsp.readdirSync(dir).filter(function (f) { return f.toLowerCase().endsWith('.md'); }).sort();
  if (files.length === 0) { console.log(empty); return; }
  files.forEach(function (f) {
    console.log('\n----- ' + f + ' -----');
    console.log(fsp.readFileSync(pathp.join(dir, f), 'utf-8').trim());
  });
  console.log('\n共 ' + files.length + ' 份真实用户记录。');
}

// ==================== 交互菜单 ====================
function ask(rl, question) { return new Promise(resolve => rl.question(question, resolve)); }

async function runMenu() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  while (true) {
    console.log('\n============================');
    console.log('  Campus Expense Tracker');
    console.log('============================');
    console.log('  1. Add expense   2. Recent records   3. Daily summary');
    console.log('  4. Weekly report  5. Export CSV       6. View logs');
    console.log('  7. Feedback       8. All data         9. Budget');
    console.log('  a. Trend chart    b. Backdate add     0. Exit');
    console.log('');
    const choice = (await ask(rl, 'Enter number: ')).trim();
    if (choice === '1') {
      const amount = (await ask(rl, 'Amount (yuan): ')).trim();
      console.log('Category: 1-Food 2-Transport 3-Shopping 4-Fun 5-Study 6-Medical 7-Other');
      const catNum = (await ask(rl, 'Select number: ')).trim();
      const note = (await ask(rl, 'Note (Enter to skip): ')).trim();
      const cats = { '1': '餐饮', '2': '交通', '3': '购物', '4': '娱乐', '5': '学习', '6': '医疗', '7': '其他' };
      addExpense(amount, cats[catNum] || '其他', note);
    } else if (choice === '2') { listExpenses(); }
    else if (choice === '3') { dailySummary(); }
    else if (choice === '4') { weeklyReport(); }
    else if (choice === '5') { exportCSV(); }
    else if (choice === '6') { showLogs(); }
    else if (choice === '7') { showFeedback(); }
    else if (choice === '8') { showData(); }
    else if (choice === '9') {
      console.log('  b: Set budget  c: Check budget');
      const sub = (await ask(rl, 'Select: ')).trim();
      if (sub === 'b') { const amt = (await ask(rl, 'Monthly budget (yuan): ')).trim(); setBudget(amt); }
      else if (sub === 'c') { checkBudget(); }
    }
    else if (choice === 'a') { trendChart(); }
    else if (choice === 'b') {
      const amount = (await ask(rl, 'Amount: ')).trim();
      console.log('Category: 1-Food 2-Transport 3-Shopping 4-Fun 5-Study 6-Medical 7-Other');
      const catNum = (await ask(rl, 'Select number: ')).trim();
      const note = (await ask(rl, 'Note: ')).trim();
      const date = (await ask(rl, 'Date (YYYY-MM-DD): ')).trim();
      const cats = { '1': '餐饮', '2': '交通', '3': '购物', '4': '娱乐', '5': '学习', '6': '医疗', '7': '其他' };
      addExpenseWithDate(amount, cats[catNum] || '其他', note, date);
    }
    else if (choice === '0') { console.log('Bye!'); rl.close(); process.exit(0); }
    else { console.log('Invalid input, try again'); }
  }
}

// ==================== CLI 入口 ====================
function showHelp() {
  console.log(`
Campus Expense Tracker v2.2
============================
Usage: node app.js <command> [args]

Commands:
  add <amount> <category> [note]  Add an expense
  batch <amount,cat,note|...>     Batch add expenses
  delete <id>                     Delete a record by ID
  modify <id> <amount> <cat> [note]  Modify a record
  addbackdate <amount> <cat> <date> [note]  Backdate expense
    Categories: 餐饮 交通 购物 娱乐 学习 医疗 其他
  list [days]                     View recent N days (default 7)
  summary [date]                  Daily summary (default today)
  weekly                          Weekly report (last 7 days)
  monthly [YYYY-MM]               Monthly report (default current month)
  trend [days]                    Consumption trend chart (default 7)
  budget [amount]                 Set/check monthly budget
  anomaly                         Check if today's spending is abnormal
  backup                          Backup data to Desktop (JSON)
  restore <file.json>             Restore data from backup file
  export                          Export CSV to Desktop
  logs                            View Telemetry logs
  feedback                        View real user feedback (feedback_raw/)
  data                            View all expense data
  menu                            Interactive menu
  help                            Show this help
`);
}

function main() {
  ensureDirs();
  const args = process.argv.slice(2);
  logTelemetry('startup', `args=${args.join(',')}`, '');
  if (args.length === 0) { showHelp(); return; }
  const cmd = args[0].toLowerCase();
  switch (cmd) {
    case 'add': if (args.length < 3) { console.log('Usage: node app.js add <amount> <category> [note]'); return; } addExpense(args[1], args[2], args[3] || ''); break;
    case 'batch': if (args.length < 2) { console.log('Usage: node app.js batch "3,餐饮,早餐|13,餐饮,午餐"'); return; } batchAdd(args[1]); break;
    case 'delete': if (args.length < 2) { console.log('Usage: node app.js delete <id>'); return; } deleteExpense(args[1]); break;
    case 'modify': if (args.length < 4) { console.log('Usage: node app.js modify <id> <amount> <category> [note]'); return; } modifyExpense(args[1], args[2], args[3], args[4] || ''); break;
    case 'list': listExpenses(parseInt(args[1]) || 7); break;
    case 'summary': dailySummary(args[1] || null); break;
    case 'weekly': weeklyReport(); break;
    case 'export': exportCSV(); break;
    case 'logs': showLogs(); break;
    case 'feedback': showFeedback(); break;
    case 'data': showData(); break;
    case 'budget': if (args.length < 2) { checkBudget(); } else { setBudget(args[1]); } break;
    case 'trend': trendChart(parseInt(args[1]) || 7); break;
    case 'addbackdate': if (args.length < 5) { console.log('Usage: node app.js addbackdate <amount> <category> <date> [note]'); return; } addExpenseWithDate(args[1], args[2], args[4] || '', args[3]); break;
    case 'monthly': monthlyReport(args[1] || null); break;
    case 'anomaly': checkAnomaly(); break;
    case 'backup': backupData(); break;
    case 'restore': if (args.length < 2) { console.log('Usage: node app.js restore <backup_file.json>'); return; } restoreData(args[1]); break;
    case 'menu': runMenu(); break;
    case 'help': showHelp(); break;
    default: console.log(`Unknown command: ${cmd}`); showHelp();
  }
}

main();
