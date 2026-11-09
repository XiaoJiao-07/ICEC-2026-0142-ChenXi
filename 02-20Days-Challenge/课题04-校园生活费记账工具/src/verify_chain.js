'use strict';
/**
 * verify_chain.js — 一键校验整条遥测链（只读）
 * 运行：node src/verify_chain.js
 * 退出码 0 = 链完整；1 = 发现篡改/断裂。
 */
const t = require('./telemetry');

const r = t.verifyAll();

console.log('证据链起始日 : ' + r.chainStart);
console.log('日志目录     : ' + r.logDir);
console.log('纳入链的文件 : ' + r.daily.length + ' 天');
console.log('记录总数     : ' + r.total + ' 条');
console.log('');
console.log('日期          行数   当日链头');
r.daily.forEach(function (d) {
  const h = d.head ? d.head.slice(0, 12) : '(空)';
  console.log(d.date + '   ' + String(d.lines).padStart(4) + '   ' + h);
});
console.log('');

if (r.ok) {
  console.log('[PASS] 哈希链完整，未发现篡改、插入或删除。');
  console.log('最终链头: ' + r.head);
  console.log('把前 8 位 ' + r.head.slice(0, 8) + ' 写进今天的 commit message，形成「日志 <-> commit」双向锚定。');
  process.exit(0);
} else {
  console.log('[FAIL] 发现 ' + r.problems.length + ' 处问题：');
  r.problems.slice(0, 30).forEach(function (p) { console.log('  - ' + p); });
  if (r.problems.length > 30) console.log('  ... 另有 ' + (r.problems.length - 30) + ' 处');
  console.log('');
  console.log('不要修改日志来「修好」它。如实记录问题发生的时间与原因，写进当天的复盘卡片。');
  process.exit(1);
}
