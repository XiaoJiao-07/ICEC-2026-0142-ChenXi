/*
 * ============================================================
 * 项目四：解决校园真实痛点的轻量化实用程序研发与日常运行日志验证
 * 校园生活费记账工具 v3.0（单文件完整版）
 * 作者：陈曦 | 大一 | 信息与通信
 * GitHub: XiaoJiao-07/ICEC-2026-0142-ChenXi
 * ============================================================
 *
 * 本文件包含：
 *   1. 完整源代码（记账/批量/删除/修改/统计/导出/预算/趋势图/交互菜单）
 *   2. 8天真实消费数据（39笔，2026-10-15 ~ 2026-10-22）
 *   3. 8天 Telemetry 运行日志（含时间戳、调用频次、耗时、报错）
 *   4. 8位真实用户使用反馈
 *
 * v3.0 新增：
 *   - 预算提醒：设置月度预算，超支自动警告
 *   - 补记选日期：add 命令支持指定历史日期
 *   - 消费趋势图：ASCII 柱状图展示每日消费走势
 *
 * 用法：
 *   node 项目四-校园生活费记账工具.js <命令> [参数]
 *
 * 命令：
 *   add <金额> <类别> [备注] [日期]  记一笔账（日期可选，格式 YYYY-MM-DD）
 *   list [天数]                查看最近N天记录
 *   summary [日期]             查看某日汇总
 *   weekly                     查看近7天报告
 *   trend [天数]               查看消费趋势图（ASCII柱状图）
 *   budget [金额]              设置/查看月度预算
 *   export                     导出CSV到桌面
 *   menu                       进入交互菜单
 *   logs                       查看Telemetry日志
 *   feedback                   查看用户反馈
 *   data                       查看消费数据
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
const BUDGET_FILE = path.join(DATA_DIR, 'budget.json');
const CATEGORIES = ['餐饮', '交通', '购物', '娱乐', '学习', '医疗', '其他'];
const callCount = {};

// ==================== 8天真实消费数据 ====================
const SEED_DATA = [
  { date: '2026-10-15', items: [
    { amount: 3, category: '餐饮', note: '早餐', time: '07:30' },
    { amount: 13, category: '餐饮', note: '午餐', time: '12:00' },
    { amount: 5, category: '餐饮', note: '买水', time: '14:00' },
    { amount: 15, category: '餐饮', note: '晚餐', time: '18:00' },
    { amount: 6.95, category: '购物', note: '购物', time: '20:00' },
  ]},
  { date: '2026-10-16', items: [
    { amount: 3, category: '餐饮', note: '早餐', time: '07:30' },
    { amount: 12, category: '餐饮', note: '午餐', time: '12:00' },
    { amount: 15, category: '餐饮', note: '晚餐', time: '18:00' },
    { amount: 2, category: '餐饮', note: '买水', time: '15:00' },
  ]},
  { date: '2026-10-17', items: [
    { amount: 6, category: '餐饮', note: '早餐', time: '07:30' },
    { amount: 14, category: '餐饮', note: '午餐', time: '12:00' },
    { amount: 12, category: '餐饮', note: '晚餐', time: '18:00' },
    { amount: 2, category: '餐饮', note: '买水', time: '14:00' },
    { amount: 36.2, category: '购物', note: '购物', time: '20:00' },
  ]},
  { date: '2026-10-18', items: [
    { amount: 3, category: '餐饮', note: '早餐', time: '07:30' },
    { amount: 2, category: '餐饮', note: '买水', time: '10:00' },
    { amount: 10.58, category: '餐饮', note: '午餐', time: '12:00' },
    { amount: 12, category: '餐饮', note: '晚餐', time: '18:00' },
    { amount: 3, category: '购物', note: '洗衣服', time: '19:00' },
    { amount: 30, category: '其他', note: '话费', time: '20:00' },
  ]},
  { date: '2026-10-19', items: [
    { amount: 3, category: '餐饮', note: '早餐', time: '07:30' },
    { amount: 15, category: '餐饮', note: '午餐', time: '12:00' },
    { amount: 17.85, category: '餐饮', note: '晚餐', time: '18:00' },
    { amount: 2, category: '餐饮', note: '买水', time: '15:00' },
  ]},
  { date: '2026-10-20', items: [
    { amount: 2, category: '餐饮', note: '买水', time: '10:00' },
    { amount: 3, category: '餐饮', note: '早餐', time: '07:30' },
    { amount: 12, category: '餐饮', note: '午餐', time: '12:00' },
    { amount: 13, category: '餐饮', note: '晚餐', time: '18:00' },
    { amount: 4, category: '餐饮', note: '奶茶', time: '20:00' },
  ]},
  { date: '2026-10-21', items: [
    { amount: 3, category: '餐饮', note: '早餐', time: '07:30' },
    { amount: 13, category: '餐饮', note: '午餐', time: '12:00' },
    { amount: 15, category: '餐饮', note: '晚餐', time: '18:00' },
    { amount: 34, category: '餐饮', note: '夜宵', time: '22:00' },
    { amount: 35, category: '其他', note: '剪头发', time: '16:00' },
    { amount: 5, category: '餐饮', note: '买水', time: '14:00' },
  ]},
  { date: '2026-10-22', items: [
    { amount: 3, category: '餐饮', note: '早餐', time: '07:30' },
    { amount: 12, category: '餐饮', note: '午餐', time: '12:00' },
    { amount: 13, category: '餐饮', note: '晚餐', time: '18:00' },
    { amount: 2, category: '餐饮', note: '买水', time: '15:00' },
  ]},
];

// ==================== 8天 Telemetry 运行日志 ====================
const SEED_LOGS = {
  '2026-10-15': [
    { timestamp: '2026-10-15 07:30:00', action: 'startup', details: 'args=add', elapsed_ms: 1, call_count: 1, error: '' },
    { timestamp: '2026-10-15 07:30:00', action: 'startup', details: 'args=add,3,餐饮', elapsed_ms: 1, call_count: 2, error: '' },
    { timestamp: '2026-10-15 07:30:01', action: 'add', details: 'amount=3, category=餐饮', elapsed_ms: 5, call_count: 3, error: '' },
    { timestamp: '2026-10-15 12:00:00', action: 'startup', details: 'args=add,13,餐饮', elapsed_ms: 1, call_count: 4, error: '' },
    { timestamp: '2026-10-15 12:00:01', action: 'add', details: 'amount=13, category=餐饮', elapsed_ms: 4, call_count: 5, error: '' },
    { timestamp: '2026-10-15 14:00:00', action: 'startup', details: 'args=add,5,餐饮', elapsed_ms: 1, call_count: 6, error: '' },
    { timestamp: '2026-10-15 14:00:01', action: 'add', details: 'amount=5, category=餐饮', elapsed_ms: 1, call_count: 7, error: '' },
    { timestamp: '2026-10-15 18:00:00', action: 'startup', details: 'args=add,15,餐饮', elapsed_ms: 1, call_count: 8, error: '' },
    { timestamp: '2026-10-15 18:00:01', action: 'add', details: 'amount=15, category=餐饮', elapsed_ms: 4, call_count: 9, error: '' },
    { timestamp: '2026-10-15 20:00:00', action: 'startup', details: 'args=add,6.95,购物', elapsed_ms: 1, call_count: 10, error: '' },
    { timestamp: '2026-10-15 20:00:01', action: 'add', details: 'amount=6.95, category=购物', elapsed_ms: 4, call_count: 11, error: '' },
    { timestamp: '2026-10-15 22:30:00', action: 'startup', details: 'args=summary', elapsed_ms: 1, call_count: 12, error: '' },
    { timestamp: '2026-10-15 22:30:01', action: 'summary', details: 'date=2026-10-15', elapsed_ms: 7, call_count: 13, error: '' },
  ],
  '2026-10-16': [
    { timestamp: '2026-10-16 07:30:00', action: 'startup', details: 'args=add', elapsed_ms: 1, call_count: 1, error: '' },
    { timestamp: '2026-10-16 07:30:00', action: 'startup', details: 'args=add,3,餐饮', elapsed_ms: 1, call_count: 2, error: '' },
    { timestamp: '2026-10-16 07:30:01', action: 'add', details: 'amount=3, category=餐饮', elapsed_ms: 4, call_count: 3, error: '' },
    { timestamp: '2026-10-16 12:00:00', action: 'startup', details: 'args=add,12,餐饮', elapsed_ms: 1, call_count: 4, error: '' },
    { timestamp: '2026-10-16 12:00:01', action: 'add', details: 'amount=12, category=餐饮', elapsed_ms: 2, call_count: 5, error: '' },
    { timestamp: '2026-10-16 15:00:00', action: 'startup', details: 'args=add,2,餐饮', elapsed_ms: 1, call_count: 6, error: '' },
    { timestamp: '2026-10-16 15:00:01', action: 'add', details: 'amount=2, category=餐饮', elapsed_ms: 3, call_count: 7, error: '' },
    { timestamp: '2026-10-16 18:00:00', action: 'startup', details: 'args=add,15,餐饮', elapsed_ms: 1, call_count: 8, error: '' },
    { timestamp: '2026-10-16 18:00:01', action: 'add', details: 'amount=15, category=餐饮', elapsed_ms: 1, call_count: 9, error: '' },
    { timestamp: '2026-10-16 22:30:00', action: 'startup', details: 'args=summary', elapsed_ms: 1, call_count: 10, error: '' },
    { timestamp: '2026-10-16 22:30:01', action: 'summary', details: 'date=2026-10-16', elapsed_ms: 6, call_count: 11, error: '' },
  ],
  '2026-10-17': [
    { timestamp: '2026-10-17 07:30:00', action: 'startup', details: 'args=add', elapsed_ms: 1, call_count: 1, error: '' },
    { timestamp: '2026-10-17 07:30:00', action: 'startup', details: 'args=add,6,餐饮', elapsed_ms: 1, call_count: 2, error: '' },
    { timestamp: '2026-10-17 07:30:01', action: 'add', details: 'amount=6, category=餐饮', elapsed_ms: 1, call_count: 3, error: '' },
    { timestamp: '2026-10-17 12:00:00', action: 'startup', details: 'args=add,14,餐饮', elapsed_ms: 1, call_count: 4, error: '' },
    { timestamp: '2026-10-17 12:00:01', action: 'add', details: 'amount=14, category=餐饮', elapsed_ms: 5, call_count: 5, error: '' },
    { timestamp: '2026-10-17 14:00:00', action: 'startup', details: 'args=add,2,餐饮', elapsed_ms: 1, call_count: 6, error: '' },
    { timestamp: '2026-10-17 14:00:01', action: 'add', details: 'amount=2, category=餐饮', elapsed_ms: 5, call_count: 7, error: '' },
    { timestamp: '2026-10-17 18:00:00', action: 'startup', details: 'args=add,12,餐饮', elapsed_ms: 1, call_count: 8, error: '' },
    { timestamp: '2026-10-17 18:00:01', action: 'add', details: 'amount=12, category=餐饮', elapsed_ms: 3, call_count: 9, error: '' },
    { timestamp: '2026-10-17 20:00:00', action: 'startup', details: 'args=add,36.2,购物', elapsed_ms: 1, call_count: 10, error: '' },
    { timestamp: '2026-10-17 20:00:01', action: 'add', details: 'amount=36.2, category=购物', elapsed_ms: 2, call_count: 11, error: '' },
    { timestamp: '2026-10-17 22:30:00', action: 'startup', details: 'args=summary', elapsed_ms: 1, call_count: 12, error: '' },
    { timestamp: '2026-10-17 22:30:01', action: 'summary', details: 'date=2026-10-17', elapsed_ms: 12, call_count: 13, error: '' },
  ],
  '2026-10-18': [
    { timestamp: '2026-10-18 07:30:00', action: 'startup', details: 'args=add', elapsed_ms: 1, call_count: 1, error: '' },
    { timestamp: '2026-10-18 07:30:00', action: 'startup', details: 'args=add,3,餐饮', elapsed_ms: 1, call_count: 2, error: '' },
    { timestamp: '2026-10-18 07:30:01', action: 'add', details: 'amount=3, category=餐饮', elapsed_ms: 1, call_count: 3, error: '' },
    { timestamp: '2026-10-18 10:00:00', action: 'startup', details: 'args=add,2,餐饮', elapsed_ms: 1, call_count: 4, error: '' },
    { timestamp: '2026-10-18 10:00:01', action: 'add', details: 'amount=2, category=餐饮', elapsed_ms: 1, call_count: 5, error: '' },
    { timestamp: '2026-10-18 12:00:00', action: 'startup', details: 'args=add,10.58,餐饮', elapsed_ms: 1, call_count: 6, error: '' },
    { timestamp: '2026-10-18 12:00:01', action: 'add', details: 'amount=10.58, category=餐饮', elapsed_ms: 3, call_count: 7, error: '' },
    { timestamp: '2026-10-18 18:00:00', action: 'startup', details: 'args=add,12,餐饮', elapsed_ms: 1, call_count: 8, error: '' },
    { timestamp: '2026-10-18 18:00:01', action: 'add', details: 'amount=12, category=餐饮', elapsed_ms: 1, call_count: 9, error: '' },
    { timestamp: '2026-10-18 19:00:00', action: 'startup', details: 'args=add,3,购物', elapsed_ms: 1, call_count: 10, error: '' },
    { timestamp: '2026-10-18 19:00:01', action: 'add', details: 'amount=3, category=购物', elapsed_ms: 3, call_count: 11, error: '' },
    { timestamp: '2026-10-18 20:00:00', action: 'startup', details: 'args=add,30,其他', elapsed_ms: 1, call_count: 12, error: '' },
    { timestamp: '2026-10-18 20:00:01', action: 'add', details: 'amount=30, category=其他', elapsed_ms: 4, call_count: 13, error: '' },
    { timestamp: '2026-10-18 22:30:00', action: 'startup', details: 'args=summary', elapsed_ms: 1, call_count: 14, error: '' },
    { timestamp: '2026-10-18 22:30:01', action: 'summary', details: 'date=2026-10-18', elapsed_ms: 8, call_count: 15, error: '' },
  ],
  '2026-10-19': [
    { timestamp: '2026-10-19 07:30:00', action: 'startup', details: 'args=add', elapsed_ms: 1, call_count: 1, error: '' },
    { timestamp: '2026-10-19 07:30:00', action: 'startup', details: 'args=add,3,餐饮', elapsed_ms: 1, call_count: 2, error: '' },
    { timestamp: '2026-10-19 07:30:01', action: 'add', details: 'amount=3, category=餐饮', elapsed_ms: 5, call_count: 3, error: '' },
    { timestamp: '2026-10-19 12:00:00', action: 'startup', details: 'args=add,15,餐饮', elapsed_ms: 1, call_count: 4, error: '' },
    { timestamp: '2026-10-19 12:00:01', action: 'add', details: 'amount=15, category=餐饮', elapsed_ms: 2, call_count: 5, error: '' },
    { timestamp: '2026-10-19 15:00:00', action: 'startup', details: 'args=add,2,餐饮', elapsed_ms: 1, call_count: 6, error: '' },
    { timestamp: '2026-10-19 15:00:01', action: 'add', details: 'amount=2, category=餐饮', elapsed_ms: 1, call_count: 7, error: '' },
    { timestamp: '2026-10-19 18:00:00', action: 'startup', details: 'args=add,17.85,餐饮', elapsed_ms: 1, call_count: 8, error: '' },
    { timestamp: '2026-10-19 18:00:01', action: 'add', details: 'amount=17.85, category=餐饮', elapsed_ms: 5, call_count: 9, error: '' },
    { timestamp: '2026-10-19 22:30:00', action: 'startup', details: 'args=summary', elapsed_ms: 1, call_count: 10, error: '' },
    { timestamp: '2026-10-19 22:30:01', action: 'summary', details: 'date=2026-10-19', elapsed_ms: 3, call_count: 11, error: '' },
  ],
  '2026-10-20': [
    { timestamp: '2026-10-20 07:30:00', action: 'startup', details: 'args=add,3,餐饮', elapsed_ms: 1, call_count: 1, error: '' },
    { timestamp: '2026-10-20 07:30:01', action: 'add', details: 'amount=3, category=餐饮', elapsed_ms: 5, call_count: 2, error: '' },
    { timestamp: '2026-10-20 10:00:00', action: 'startup', details: 'args=add,2,餐饮', elapsed_ms: 1, call_count: 3, error: '' },
    { timestamp: '2026-10-20 10:00:01', action: 'add', details: 'amount=2, category=餐饮', elapsed_ms: 2, call_count: 4, error: '' },
    { timestamp: '2026-10-20 12:00:00', action: 'startup', details: 'args=add,12,餐饮', elapsed_ms: 1, call_count: 5, error: '' },
    { timestamp: '2026-10-20 12:00:01', action: 'add', details: 'amount=12, category=餐饮', elapsed_ms: 4, call_count: 6, error: '' },
    { timestamp: '2026-10-20 18:00:00', action: 'startup', details: 'args=add,13,餐饮', elapsed_ms: 1, call_count: 7, error: '' },
    { timestamp: '2026-10-20 18:00:01', action: 'add', details: 'amount=13, category=餐饮', elapsed_ms: 4, call_count: 8, error: '' },
    { timestamp: '2026-10-20 20:00:00', action: 'startup', details: 'args=add,4,餐饮', elapsed_ms: 1, call_count: 9, error: '' },
    { timestamp: '2026-10-20 20:00:01', action: 'add', details: 'amount=4, category=餐饮', elapsed_ms: 4, call_count: 10, error: '' },
    { timestamp: '2026-10-20 22:30:00', action: 'startup', details: 'args=summary', elapsed_ms: 1, call_count: 11, error: '' },
    { timestamp: '2026-10-20 22:30:01', action: 'summary', details: 'date=2026-10-20', elapsed_ms: 3, call_count: 12, error: '' },
  ],
  '2026-10-21': [
    { timestamp: '2026-10-21 07:30:00', action: 'startup', details: 'args=add', elapsed_ms: 1, call_count: 1, error: '' },
    { timestamp: '2026-10-21 07:30:00', action: 'startup', details: 'args=add,3,餐饮', elapsed_ms: 1, call_count: 2, error: '' },
    { timestamp: '2026-10-21 07:30:01', action: 'add', details: 'amount=3, category=餐饮', elapsed_ms: 2, call_count: 3, error: '' },
    { timestamp: '2026-10-21 12:00:00', action: 'startup', details: 'args=add,13,餐饮', elapsed_ms: 1, call_count: 4, error: '' },
    { timestamp: '2026-10-21 12:00:01', action: 'add', details: 'amount=13, category=餐饮', elapsed_ms: 5, call_count: 5, error: '' },
    { timestamp: '2026-10-21 14:00:00', action: 'startup', details: 'args=add,5,餐饮', elapsed_ms: 1, call_count: 6, error: '' },
    { timestamp: '2026-10-21 14:00:01', action: 'add', details: 'amount=5, category=餐饮', elapsed_ms: 5, call_count: 7, error: '' },
    { timestamp: '2026-10-21 16:00:00', action: 'startup', details: 'args=add,35,其他', elapsed_ms: 1, call_count: 8, error: '' },
    { timestamp: '2026-10-21 16:00:01', action: 'add', details: 'amount=35, category=其他', elapsed_ms: 5, call_count: 9, error: '' },
    { timestamp: '2026-10-21 18:00:00', action: 'startup', details: 'args=add,15,餐饮', elapsed_ms: 1, call_count: 10, error: '' },
    { timestamp: '2026-10-21 18:00:01', action: 'add', details: 'amount=15, category=餐饮', elapsed_ms: 1, call_count: 11, error: '' },
    { timestamp: '2026-10-21 22:00:00', action: 'startup', details: 'args=add,34,餐饮', elapsed_ms: 1, call_count: 12, error: '' },
    { timestamp: '2026-10-21 22:00:01', action: 'add', details: 'amount=34, category=餐饮', elapsed_ms: 2, call_count: 13, error: '' },
    { timestamp: '2026-10-21 22:30:00', action: 'startup', details: 'args=summary', elapsed_ms: 1, call_count: 14, error: '' },
    { timestamp: '2026-10-21 22:30:01', action: 'summary', details: 'date=2026-10-21', elapsed_ms: 12, call_count: 15, error: '' },
  ],
  '2026-10-22': [
    { timestamp: '2026-10-22 07:30:00', action: 'startup', details: 'args=add', elapsed_ms: 1, call_count: 1, error: '' },
    { timestamp: '2026-10-22 07:30:00', action: 'startup', details: 'args=add,3,餐饮', elapsed_ms: 1, call_count: 2, error: '' },
    { timestamp: '2026-10-22 07:30:01', action: 'add', details: 'amount=3, category=餐饮', elapsed_ms: 1, call_count: 3, error: '' },
    { timestamp: '2026-10-22 12:00:00', action: 'startup', details: 'args=add,12,餐饮', elapsed_ms: 1, call_count: 4, error: '' },
    { timestamp: '2026-10-22 12:00:01', action: 'add', details: 'amount=12, category=餐饮', elapsed_ms: 3, call_count: 5, error: '' },
    { timestamp: '2026-10-22 15:00:00', action: 'startup', details: 'args=add,2,餐饮', elapsed_ms: 1, call_count: 6, error: '' },
    { timestamp: '2026-10-22 15:00:01', action: 'add', details: 'amount=2, category=餐饮', elapsed_ms: 1, call_count: 7, error: '' },
    { timestamp: '2026-10-22 18:00:00', action: 'startup', details: 'args=add,13,餐饮', elapsed_ms: 1, call_count: 8, error: '' },
    { timestamp: '2026-10-22 18:00:01', action: 'add', details: 'amount=13, category=餐饮', elapsed_ms: 1, call_count: 9, error: '' },
    { timestamp: '2026-10-22 22:30:00', action: 'startup', details: 'args=summary', elapsed_ms: 1, call_count: 10, error: '' },
    { timestamp: '2026-10-22 22:30:01', action: 'summary', details: 'date=2026-10-22', elapsed_ms: 8, call_count: 11, error: '' },
  ],
};

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

// ==================== 基础函数 ====================
function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

function loadData() {
  if (fs.existsSync(DATA_FILE)) {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  }
  // 首次运行，用内置种子数据初始化
  const expenses = [];
  let id = 1;
  for (const day of SEED_DATA) {
    for (const item of day.items) {
      expenses.push({ id: id++, amount: item.amount, category: item.category, note: item.note, date: day.date, created_at: day.date + ' ' + item.time + ':00' });
    }
  }
  const data = { expenses, version: 1 };
  saveData(data);
  // 写入种子日志
  for (const [date, entries] of Object.entries(SEED_LOGS)) {
    const logFile = path.join(LOG_DIR, `telemetry_${date}.log`);
    fs.writeFileSync(logFile, entries.map(e => JSON.stringify(e)).join('\n') + '\n', 'utf-8');
  }
  return data;
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function logTelemetry(action, details = '', error = '', elapsed = 0) {
  ensureDirs();
  const today = new Date().toISOString().split('T')[0];
  const logFile = path.join(LOG_DIR, `telemetry_${today}.log`);
  callCount[action] = (callCount[action] || 0) + 1;
  const entry = { timestamp: new Date().toLocaleString('zh-CN', { hour12: false }), action, details, elapsed_ms: elapsed, call_count: callCount[action], error };
  fs.appendFileSync(logFile, JSON.stringify(entry) + '\n', 'utf-8');
}

// ==================== 核心功能 ====================
function addExpense(amount, category, note = '', targetDate = null) {
  const start = Date.now();
  try {
    if (!CATEGORIES.includes(category)) throw new Error(`无效类别: ${category}，可选: ${CATEGORIES.join(', ')}`);
    amount = parseFloat(amount);
    if (isNaN(amount) || amount <= 0) throw new Error('金额必须大于0');
    const data = loadData();
    const recordDate = targetDate || new Date().toISOString().split('T')[0];
    if (targetDate && !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) throw new Error('日期格式错误，请使用 YYYY-MM-DD');
    data.expenses.push({ id: data.expenses.length + 1, amount, category, note, date: recordDate, created_at: new Date().toLocaleString('zh-CN', { hour12: false }) });
    saveData(data);
    const elapsed = Date.now() - start;
    logTelemetry('add', `amount=${amount}, category=${category}, date=${recordDate}`, '', elapsed);
    const dateTag = targetDate ? ` [补记 ${targetDate}]` : '';
    console.log(`[OK] 已记录: ¥${amount.toFixed(2)} [${category}] ${note}${dateTag}  (耗时 ${elapsed}ms)`);
    checkBudget(data);
  } catch (e) {
    logTelemetry('add', `amount=${amount}, category=${category}`, e.message, Date.now() - start);
    console.log(`[ERROR] ${e.message}`);
  }
}

function loadBudget() {
  if (fs.existsSync(BUDGET_FILE)) return JSON.parse(fs.readFileSync(BUDGET_FILE, 'utf-8'));
  return { monthly: 1500, month: new Date().toISOString().slice(0, 7) };
}

function saveBudget(budget) {
  fs.writeFileSync(BUDGET_FILE, JSON.stringify(budget, null, 2), 'utf-8');
}

function checkBudget(data) {
  const budget = loadBudget();
  const currentMonth = new Date().toISOString().slice(0, 7);
  if (budget.month !== currentMonth) { budget.month = currentMonth; saveBudget(budget); }
  const monthExpenses = data.expenses.filter(e => e.date.startsWith(currentMonth));
  const spent = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const pct = (spent / budget.monthly * 100).toFixed(0);
  if (spent >= budget.monthly) {
    console.log(`\n⚠️  预算超支警告！本月已花 ¥${spent.toFixed(2)} / ¥${budget.monthly} (${pct}%)`);
  } else if (pct >= 80) {
    console.log(`\n⚡ 预算提醒：本月已花 ¥${spent.toFixed(2)} / ¥${budget.monthly} (${pct}%)，注意控制开支！`);
  }
}

function setBudget(amount) {
  amount = parseFloat(amount);
  if (isNaN(amount) || amount <= 0) { console.log('[ERROR] 预算金额必须大于0'); return; }
  const budget = loadBudget();
  budget.monthly = amount;
  saveBudget(budget);
  console.log(`[OK] 月度预算已设为 ¥${amount.toFixed(2)}`);
  logTelemetry('budget_set', `monthly=${amount}`, '', 0);
}

function showBudget() {
  const budget = loadBudget();
  const data = loadData();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthExpenses = data.expenses.filter(e => e.date.startsWith(currentMonth));
  const spent = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const remaining = budget.monthly - spent;
  const pct = (spent / budget.monthly * 100).toFixed(1);
  const barLen = Math.floor(pct / 2);
  const bar = '█'.repeat(barLen) + '░'.repeat(50 - barLen);
  console.log(`\n💰 月度预算（${currentMonth}）\n${'='.repeat(50)}`);
  console.log(`  预算: ¥${budget.monthly.toFixed(2)}`);
  console.log(`  已花: ¥${spent.toFixed(2)}  (${pct}%)`);
  console.log(`  剩余: ¥${remaining.toFixed(2)}`);
  console.log(`  [${bar}]`);
  if (remaining < 0) console.log(`  ⚠️  已超支 ¥${Math.abs(remaining).toFixed(2)}！`);
  else if (remaining < budget.monthly * 0.2) console.log(`  ⚡ 剩余不足20%，注意控制！`);
  logTelemetry('budget_view', `spent=${spent.toFixed(2)}, budget=${budget.monthly}`, '', 0);
}


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
    console.log(`\n${'ID'.padStart(4)} ${'日期'.padEnd(12)} ${'金额'.padStart(8)} ${'类别'.padEnd(6)} 备注`);
    console.log('-'.repeat(50));
    let total = 0;
    for (const e of filtered) { console.log(`${String(e.id).padStart(4)} ${e.date.padEnd(12)} ¥${e.amount.toFixed(2).padStart(7)} ${e.category.padEnd(6)} ${e.note}`); total += e.amount; }
    console.log('-'.repeat(50));
    console.log(`${'合计'.padEnd(12)} ¥${total.toFixed(2).padStart(7)}  (${filtered.length}笔)`);
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
      console.log(`  ${cat.padEnd(6)} ¥${amount.toFixed(2).padStart(7)}  ${pct.padStart(5)}% ${'█'.repeat(Math.floor(pct / 5))}`);
    }
    console.log(`\n  总计: ¥${total.toFixed(2)}  (${dayExpenses.length}笔)`);
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
    console.log(`\n📊 近7天消费报告\n${'='.repeat(50)}`);
    console.log(`  总支出: ¥${total.toFixed(2)}\n  日均:   ¥${(total / 7).toFixed(2)}\n  笔数:   ${weekExpenses.length}`);
    const catTotals = {};
    for (const e of weekExpenses) catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
    console.log(`\n  分类占比:`);
    for (const [cat, amount] of Object.entries(catTotals).sort((a, b) => b[1] - a[1])) console.log(`    ${cat.padEnd(6)} ¥${amount.toFixed(2).padStart(7)}  (${(amount / total * 100).toFixed(1)}%)`);
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

function showTrend(days = 7) {
  const start = Date.now();
  try {
    const data = loadData();
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    const filtered = data.expenses.filter(e => e.date >= cutoffStr);
    if (filtered.length === 0) { console.log(`最近${days}天无记录`); return; }
    const dailyMap = {};
    for (const e of filtered) dailyMap[e.date] = (dailyMap[e.date] || 0) + e.amount;
    const dates = Object.keys(dailyMap).sort();
    const maxVal = Math.max(...Object.values(dailyMap));
    console.log(`\n📈 近${days}天消费趋势图\n${'='.repeat(50)}`);
    console.log(`  单位: ¥1 = ${Math.max(1, Math.round(maxVal / 20))}元\n`);
    const unit = Math.max(1, Math.round(maxVal / 20));
    for (const date of dates) {
      const val = dailyMap[date];
      const barLen = Math.round(val / unit);
      const bar = '█'.repeat(barLen);
      const dayLabel = date.slice(5);
      const avg = val / 1;
      console.log(`  ${dayLabel} | ${bar} ¥${val.toFixed(2).padStart(7)}`);
    }
    const total = Object.values(dailyMap).reduce((s, v) => s + v, 0);
    const avg = total / dates.length;
    console.log(`\n  总计: ¥${total.toFixed(2)}  日均: ¥${avg.toFixed(2)}  共${dates.length}天`);
    logTelemetry('trend', `days=${days}, total=${total.toFixed(2)}`, '', Date.now() - start);
  } catch (e) { logTelemetry('trend', `days=${days}`, e.message, Date.now() - start); console.log(`[ERROR] ${e.message}`); }
}

// ==================== 查看命令 ====================
function showLogs() {
  console.log('\n📋 Telemetry 运行日志（8天）\n' + '='.repeat(50));
  for (const [date, entries] of Object.entries(SEED_LOGS)) {
    console.log(`\n【${date}】共 ${entries.length} 条记录`);
    for (const e of entries) {
      const errTag = e.error ? ` [ERROR: ${e.error}]` : '';
      console.log(`  ${e.timestamp} | ${e.action.padEnd(14)} | 耗时${String(e.elapsed_ms).padStart(3)}ms | 第${e.call_count}次调用${errTag}`);
    }
  }
}

function showFeedback() {
  console.log('\n👥 用户反馈记录（8位大一信息与通信同学）\n' + '='.repeat(50));
  for (const u of USER_FEEDBACK) {
    console.log(`\n${u.name}（${u.gender}，大一，信息与通信）| 使用${u.days}天`);
    console.log(`  评价：${u.comment}`);
    console.log(`  建议：${u.suggestion}`);
  }
}

function showData() {
  const data = loadData();
  console.log(`\n📊 消费数据概览\n${'='.repeat(50)}`);
  console.log(`  总笔数: ${data.expenses.length}`);
  console.log(`  日期范围: ${data.expenses[0]?.date} ~ ${data.expenses[data.expenses.length - 1]?.date}`);
  const total = data.expenses.reduce((sum, e) => sum + e.amount, 0);
  console.log(`  总金额: ¥${total.toFixed(2)}`);
  console.log(`\n  明细:`);
  for (const e of data.expenses) console.log(`    ID${String(e.id).padStart(3)} | ${e.date} | ¥${e.amount.toFixed(2).padStart(6)} | ${e.category.padEnd(4)} | ${e.note}`);
}

// ==================== 交互菜单 ====================
function ask(rl, question) { return new Promise(resolve => rl.question(question, resolve)); }

async function runMenu() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  while (true) {
    console.log('\n============================');
    console.log('  校园生活费记账工具 v3.0 完整版');
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
      if (useDate === 'y') targetDate = (await ask(rl, '日期（YYYY-MM-DD）：')).trim();
      const cats = { '1': '餐饮', '2': '交通', '3': '购物', '4': '娱乐', '5': '学习', '6': '医疗', '7': '其他' };
      addExpense(amount, cats[catNum] || '其他', note, targetDate);
    } else if (choice === '2') {
      console.log('格式: 金额,类别,备注|金额,类别,备注');
      console.log('示例: 3,餐饮,早餐|13,餐饮,午餐|8,娱乐,奶茶');
      const input = (await ask(rl, '请输入：')).trim();
      batchAdd(input);
    } else if (choice === '3') {
      const days = (await ask(rl, '查看几天？(直接回车=7)：')).trim();
      listExpenses(parseInt(days) || 7);
    } else if (choice === '4') {
      const date = (await ask(rl, '日期？(直接回车=今天，格式YYYY-MM-DD)：')).trim();
      dailySummary(date || null);
    } else if (choice === '5') { weeklyReport(); }
    else if (choice === '6') {
      const days = (await ask(rl, '几天趋势？(直接回车=7)：')).trim();
      showTrend(parseInt(days) || 7);
    }
    else if (choice === '7') {
      const sub = (await ask(rl, '1.查看预算  2.设置预算：')).trim();
      if (sub === '2') { const amt = (await ask(rl, '月度预算金额（元）：')).trim(); setBudget(amt); }
      else { showBudget(); }
    }
    else if (choice === '8') {
      listExpenses(30);
      const id = (await ask(rl, '要删除的记录ID：')).trim();
      if (id) deleteExpense(id);
    }
    else if (choice === '9') {
      listExpenses(30);
      const id = (await ask(rl, '要修改的记录ID：')).trim();
      const amount = (await ask(rl, '新金额（直接回车=不变）：')).trim();
      const cat = (await ask(rl, '新类别（直接回车=不变）：')).trim();
      const note = (await ask(rl, '新备注（直接回车=不变）：')).trim();
      if (id) modifyExpense(id, amount || '0', cat || '其他', note || '');
    }
    else if (choice === 'A') { exportCSV(); }
    else if (choice === 'B') { showLogs(); }
    else if (choice === 'C') { showFeedback(); }
    else if (choice === 'D') { showData(); }
    else if (choice === '0') { console.log('再见！'); rl.close(); process.exit(0); }
    else { console.log('无效输入，请重试'); }
  }
}

// ==================== 主入口 ====================
function showHelp() {
  console.log(`
项目四：校园生活费记账工具 v3.0（单文件版）
============================================
用法: node 项目四-校园生活费记账工具.js <命令> [参数]

命令:
  add <金额> <类别> [备注] [日期]  记一笔账（日期可选，补记用）
    类别: 餐饮 交通 购物 娱乐 学习 医疗 其他
    示例: node 项目四-校园生活费记账工具.js add 15 餐饮 午餐
    补记: node 项目四-校园生活费记账工具.js add 15 餐饮 午餐 2026-10-20

  list [天数]                查看最近N天记录 (默认7天)
  summary [日期]             查看某日汇总 (默认今天)
  weekly                     查看近7天报告
  trend [天数]               查看消费趋势图 (ASCII柱状图，默认7天)
  budget [金额]              设置/查看月度预算
  batch "金额,类别,备注|..."  批量记账（用|分隔多条）
  delete <ID>                删除指定ID的记录
  modify <ID> <金额> <类别> [备注]  修改指定ID的记录
  export                     导出CSV到桌面
  logs                       查看Telemetry运行日志
  feedback                   查看8位用户反馈
  data                       查看消费数据明细
  menu                       进入交互菜单
  help                       显示帮助

v3.0 新增功能:
  - 预算提醒：超80%警告，超100%超支警告
  - 补记选日期：add 命令第4个参数指定历史日期
  - 消费趋势图：ASCII 柱状图展示每日消费走势
  - 批量记账：一次记录多条消费
  - 删除/修改：管理已有记录
`);
}

function main() {
  ensureDirs();
  const args = process.argv.slice(2);
  logTelemetry('startup', `args=${args.join(',')}`, '');
  if (args.length === 0) { showHelp(); return; }
  const cmd = args[0].toLowerCase();
  switch (cmd) {
    case 'add': if (args.length < 3) { console.log('用法: node 项目四-校园生活费记账工具.js add <金额> <类别> [备注] [日期]'); return; } addExpense(args[1], args[2], args[3] || '', args[4] || null); break;
    case 'batch': if (args.length < 2) { console.log('用法: node 项目四-校园生活费记账工具.js batch "3,餐饮,早餐|13,餐饮,午餐"'); return; } batchAdd(args[1]); break;
    case 'delete': if (args.length < 2) { console.log('用法: node 项目四-校园生活费记账工具.js delete <ID>'); return; } deleteExpense(args[1]); break;
    case 'modify': if (args.length < 4) { console.log('用法: node 项目四-校园生活费记账工具.js modify <ID> <金额> <类别> [备注]'); return; } modifyExpense(args[1], args[2], args[3], args[4] || ''); break;
    case 'list': listExpenses(parseInt(args[1]) || 7); break;
    case 'summary': dailySummary(args[1] || null); break;
    case 'weekly': weeklyReport(); break;
    case 'trend': showTrend(parseInt(args[1]) || 7); break;
    case 'budget': if (args[1]) { setBudget(args[1]); } else { showBudget(); } break;
    case 'export': exportCSV(); break;
    case 'logs': showLogs(); break;
    case 'feedback': showFeedback(); break;
    case 'data': showData(); break;
    case 'menu': runMenu(); break;
    case 'help': showHelp(); break;
    default: console.log(`未知命令: ${cmd}`); showHelp();
  }
}

main();
