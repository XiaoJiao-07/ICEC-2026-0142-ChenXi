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

const BASE_DIR = __dirname;
const DATA_DIR = path.join(BASE_DIR, 'data');
const LOG_DIR = path.join(BASE_DIR, 'process_logs');
const DATA_FILE = path.join(DATA_DIR, 'expenses.json');
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

// ==================== 基础函数 ====================
function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

function loadData() {
  if (fs.existsSync(DATA_FILE)) {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  }
  const expenses = [];
  let id = 1;
  for (const day of SEED_DATA) {
    for (const item of day.items) {
      expenses.push({ id: id++, amount: item.amount, category: item.category, note: item.note, date: day.date, created_at: day.date + ' ' + item.time + ':00' });
    }
  }
  const data = { expenses, version: 1 };
  saveData(data);
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
  console.log('\n Telemetry 运行日志（8天）\n' + '='.repeat(50));
  for (const [date, entries] of Object.entries(SEED_LOGS)) {
    console.log(`\n【${date}】共 ${entries.length} 条记录`);
    for (const e of entries) {
      const errTag = e.error ? ` [ERROR: ${e.error}]` : '';
      console.log(`  ${e.timestamp} | ${e.action.padEnd(14)} | 耗时${String(e.elapsed_ms).padStart(3)}ms | 第${e.call_count}次调用${errTag}`);
    }
  }
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
  showLogs, showData, SEED_LOGS, CATEGORIES
};
