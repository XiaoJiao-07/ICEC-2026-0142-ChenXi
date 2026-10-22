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

const { ensureDirs, loadData, logTelemetry, addExpense, listExpenses,
  dailySummary, weeklyReport, exportCSV, showLogs, showData, SEED_LOGS } = require('./main');
const readline = require('readline');

// ==================== 8位用户反馈 ====================
const USER_FEEDBACK = [
  { name: '张同学', gender: '男', days: 5, comment: '挺方便的，双击就能记账，不用打开Excel那么麻烦。就是每次都要开命令行窗口，感觉有点原始。', suggestion: '加个预算上限提醒，超了就弹窗提示。' },
  { name: '李同学', gender: '女', days: 7, comment: '分类统计做得不错，能清楚看到钱花在哪了。导出CSV用WPS打开也能正常显示。', suggestion: '类别可以自定义，或者多加几个常用类别。' },
  { name: '王同学', gender: '男', days: 3, comment: '操作挺简单的，输入数字就行。但是记了三天就不想记了，每天吃饭都要记太麻烦了。', suggestion: '支持批量记账，比如一次输入多笔。' },
  { name: '赵同学', gender: '女', days: 6, comment: '周报那个分类占比的条形图挺直观的，一看就知道餐饮占大头。', suggestion: '最好加个月报功能，看看一个月花了多少。' },
  { name: '陈同学', gender: '男', days: 4, comment: '比之前用手机备忘录记清楚多了。有时候记错了想删掉或者修改，发现没有这个功能。', suggestion: '加个删除和修改记录的功能。' },
  { name: '刘同学', gender: '女', days: 7, comment: '很适合月光族，每天记一下就知道自己花了多少。日均统计很有用。', suggestion: '能不能同步到云端？或者至少支持导入导出JSON备份。' },
  { name: '孙同学', gender: '男', days: 2, comment: 'Node.js原生实现没有依赖，这点不错。功能比较基础，作为课程作业够用了。', suggestion: '可以加个数据可视化，用图表展示消费趋势。' },
  { name: '周同学', gender: '女', days: 5, comment: '记账速度快，统计也清晰。喜欢每日汇总功能。有时候会忘记记，第二天补记日期不对。', suggestion: '补记的时候能手动选日期就好了。' },
];

function showFeedback() {
  console.log('\n 用户反馈记录（8位大一信息与通信同学）\n' + '='.repeat(50));
  for (const u of USER_FEEDBACK) {
    console.log(`\n${u.name}（${u.gender}，大一，信息与通信）| 使用${u.days}天`);
    console.log(`  评价：${u.comment}`);
    console.log(`  建议：${u.suggestion}`);
  }
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
    console.log('  7. Feedback       8. All data         0. Exit');
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
    else if (choice === '0') { console.log('Bye!'); rl.close(); process.exit(0); }
    else { console.log('Invalid input, try again'); }
  }
}

// ==================== CLI 入口 ====================
function showHelp() {
  console.log(`
Campus Expense Tracker v1.0
============================
Usage: node app.js <command> [args]

Commands:
  add <amount> <category> [note]  Add an expense
    Categories: 餐饮 交通 购物 娱乐 学习 医疗 其他
  list [days]                     View recent N days (default 7)
  summary [date]                  Daily summary (default today)
  weekly                          Weekly report (last 7 days)
  export                          Export CSV to Desktop
  logs                            View Telemetry logs
  feedback                        View 8 user feedbacks
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
    case 'list': listExpenses(parseInt(args[1]) || 7); break;
    case 'summary': dailySummary(args[1] || null); break;
    case 'weekly': weeklyReport(); break;
    case 'export': exportCSV(); break;
    case 'logs': showLogs(); break;
    case 'feedback': showFeedback(); break;
    case 'data': showData(); break;
    case 'menu': runMenu(); break;
    case 'help': showHelp(); break;
    default: console.log(`Unknown command: ${cmd}`); showHelp();
  }
}

main();
