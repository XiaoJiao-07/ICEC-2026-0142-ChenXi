const readline = require('readline');
const { execSync } = require('child_process');
const path = require('path');

const DIR = __dirname;
const MAIN = path.join(DIR, 'main.js');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

function run(cmd) {
  try {
    const out = execSync(`node "${MAIN}" ${cmd}`, { encoding: 'utf-8', cwd: DIR });
    console.log(out);
  } catch (e) {
    console.log(e.stdout || e.message);
  }
}

async function menu() {
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

    const choice = (await ask('请输入数字：')).trim();

    if (choice === '1') {
      const amount = (await ask('金额（元）：')).trim();
      console.log('类别：1餐饮 2交通 3购物 4娱乐 5学习 6医疗 7其他');
      const catNum = (await ask('选数字：')).trim();
      const note = (await ask('备注（直接回车跳过）：')).trim();
      const cats = { '1': '餐饮', '2': '交通', '3': '购物', '4': '娱乐', '5': '学习', '6': '医疗', '7': '其他' };
      const category = cats[catNum] || '其他';
      run(`add ${amount} ${category} ${note}`);
    } else if (choice === '2') {
      run('list');
    } else if (choice === '3') {
      run('summary');
    } else if (choice === '4') {
      run('weekly');
    } else if (choice === '5') {
      run('export');
    } else if (choice === '0') {
      console.log('再见！');
      rl.close();
      process.exit(0);
    } else {
      console.log('无效输入，请重试');
    }
  }
}

menu();
