# 校园生活费记账工具

轻量级命令行记账工具，帮助大学生快速记录日常消费、分析支出趋势。零安装、数据本地存储。

## 特性

- **快速记账** — 3秒完成一笔记录
- **批量录入** — 一次输入多笔消费
- **智能统计** — 日汇总、周报、消费趋势图
- **预算提醒** — 超80%警告，超100%超支警告
- **数据导出** — CSV格式，兼容WPS/Excel
- **记录管理** — 支持删除、修改、补记历史日期

## 快速开始

### 环境要求

- Node.js v14 或更高版本
- 无需安装任何依赖

### 使用交互菜单

```bash
node main.js menu
```

### 使用命令行

```bash
# 记一笔账
node main.js add 15 餐饮 午餐

# 补记历史日期
node main.js add 15 餐饮 午餐 2026-10-20

# 批量记账（用 | 分隔）
node main.js batch "3,餐饮,早餐|13,餐饮,午餐|8,娱乐,奶茶"

# 查看最近7天记录
node main.js list

# 查看今日汇总
node main.js summary

# 查看消费趋势图
node main.js trend
```

## 命令参考

| 命令 | 说明 | 示例 |
|------|------|------|
| `add` | 记一笔账 | `add 15 餐饮 午餐` |
| `batch` | 批量记账 | `batch "3,餐饮,早餐\|13,餐饮,午餐"` |
| `delete` | 删除记录 | `delete 42` |
| `modify` | 修改记录 | `modify 42 15 餐饮 新备注` |
| `list` | 查看记录 | `list 7`（最近7天） |
| `summary` | 日汇总 | `summary 2026-10-20` |
| `weekly` | 近7天报告 | `weekly` |
| `trend` | 消费趋势图 | `trend 7` |
| `budget` | 预算管理 | `budget 1500`（设置预算） |
| `export` | 导出CSV | `export` |
| `logs` | 运行日志 | `logs` |
| `feedback` | 用户反馈 | `feedback` |
| `data` | 数据概览 | `data` |
| `menu` | 交互菜单 | `menu` |
| `help` | 显示帮助 | `help` |

## 消费类别

餐饮、交通、购物、娱乐、学习、医疗、其他

## 项目结构

```
├── main.js              # 主程序
├── README.md            # 项目文档
├── user_feedback.md     # 用户反馈详情
├── raw_data/            # 原始数据
│   └── consumption_raw.csv
├── process_logs/        # 运行日志
│   └── log_2026-10-15.json
── data/                # 运行时数据（自动生成）
```

## 数据来源

`raw_data/consumption_raw.csv` 包含8天真实消费记录（2026-10-15 ~ 2026-10-22），共39笔。首次运行时自动加载到 `data/expenses.json`。

## 更多信息

- [用户反馈详情](user_feedback.md)
- [GitHub 提交历史](https://github.com/XiaoJiao-07/ICEC-2026-0142-ChenXi/commits/main/02-20Days-Challenge)

## 作者

陈曦 | 大一 | 信息与通信
