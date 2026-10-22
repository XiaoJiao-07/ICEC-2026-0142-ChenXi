# 项目四：校园生活费记账工具

## 项目信息

| 项目 | 内容 |
|------|------|
| 课题 | 解决校园真实痛点的轻量化实用程序研发与日常运行日志验证 |
| 作者 | 陈曦 |
| 年级 | 大一 |
| 专业 | 信息与通信 |
| GitHub | [XiaoJiao-07/ICEC-2026-0142-ChenXi](https://github.com/XiaoJiao-07/ICEC-2026-0142-ChenXi) |

## 痛点分析

大学生每月生活费有限，但消费零散（早餐3元、午餐13元、奶茶8元……），很难清楚知道钱花在了哪里。现有记账APP功能臃肿、需要注册登录，很多同学坚持不下来。本工具针对这一痛点，提供一个**零安装、双击即用、数据本地存储**的轻量化记账方案。

## 文件结构

```
课题04-校园生活费记账工具/
├── main.js          ← 核心程序（记账/统计/导出/日志）
├── app.js           ← 交互菜单 + CLI入口
├── 记账.bat         ← 桌面快捷方式（双击启动）
├── user_feedback.md ← 8位用户反馈
├── raw_data/        ← 原始消费数据表
│   └── consumption_raw.csv
├── process_logs/    ← 8天Telemetry运行日志（已上传）
│   ├── telemetry_2026-10-15.log
│   ├── telemetry_2026-10-16.log
│   ── ... (共8天)
├── data/            ← 消费数据（本地存储，不上传）
│   └── expenses.json
└── README.md
```

## 功能列表

| 功能 | 说明 |
|------|------|
| 记一笔账 | 输入金额、选类别、写备注，3秒完成 |
| 批量记账 | 一次输入多笔，用 \| 分隔 |
| 删除记录 | 按ID删除某条记录 |
| 修改记录 | 按ID修改金额/类别/备注 |
| 查看记录 | 按天倒序展示最近N天消费明细 |
| 今日汇总 | 按分类统计当天消费，含占比条形图 |
| 近7天报告 | 总支出、日均、分类占比一览 |
| 导出CSV | 一键导出到桌面，WPS/Excel可直接打开 |
| 交互菜单 | 数字选择，不用记命令 |
| Telemetry日志 | 自动记录每次操作的时间戳、耗时、调用次数、报错 |
| 用户反馈 | 8位同学的真实使用反馈 |

## 环境要求

- **Node.js**（v14 或以上）
- 无需安装任何第三方依赖
- 支持 Windows / macOS / Linux

## 使用方法

### 方式一：双击启动

双击 `记账.bat` 即可进入交互菜单。

### 方式二：命令行

```bash
node app.js menu
```

### 方式三：直接执行命令

```bash
# 记一笔账
node app.js add 15 餐饮 午餐

# 批量记账
node app.js batch "3,餐饮,早餐|13,餐饮,午餐|5,餐饮,买水"

# 删除记录
node app.js delete 5

# 修改记录
node app.js modify 5 20 购物 新备注

# 查看最近7天记录
node app.js list

# 查看今日汇总
node app.js summary

# 查看近7天报告
node app.js weekly

# 导出CSV到桌面
node app.js export

# 查看Telemetry运行日志
node app.js logs

# 查看用户反馈
node app.js feedback

# 查看消费数据
node app.js data
```

## 消费类别

| 编号 | 类别 |
|------|------|
| 1 | 餐饮 |
| 2 | 交通 |
| 3 | 购物 |
| 4 | 娱乐 |
| 5 | 学习 |
| 6 | 医疗 |
| 7 | 其他 |

## 内置数据

内置了作者本人 **8天（2026-10-15 ~ 2026-10-22）的真实消费记录**，共39笔，日均约40元。首次运行后数据会自动写入 `data/expenses.json`，之后记账操作会在此基础上追加。

## Telemetry 日志格式

每条日志包含以下字段：

```json
{
  "timestamp": "2026/10/15 07:31:25",
  "action": "add",
  "details": "amount=3, category=餐饮",
  "elapsed_ms": 2,
  "call_count": 1,
  "error": ""
}
```

- `timestamp`：操作时间
- `action`：操作类型（add/batch_add/delete/modify/list/summary/weekly_report/export_csv）
- `details`：操作参数详情
- `elapsed_ms`：执行耗时（毫秒）
- `call_count`：该操作累计调用次数
- `error`：错误信息（无错误为空字符串）

## 用户反馈摘要

8位大一信息与通信专业同学的真实使用反馈见 `user_feedback.md`。主要评价：

- 操作便捷，双击即用
- 分类统计清晰直观
- CSV导出兼容WPS
- 建议增加预算提醒、自定义类别、删除修改功能等

## Git 迭代记录

| 版本 | 日期 | 变更内容 | 依据 |
|------|------|----------|------|
| v1.0 | 2026-10-22 | 重构为多文件结构，补充 process_logs 和 raw_data | 防脱敏要求 |
| v1.1 | 2026-10-22 | 新增批量记账功能 | 日志分析：用户每天多次调用add；王同学反馈"每天吃饭都要记太麻烦" |
| v1.2 | 2026-10-22 | 新增删除和修改记录功能 | 陈同学反馈"记错了想删掉或者修改，发现没有这个功能" |

[查看完整提交历史](https://github.com/XiaoJiao-07/ICEC-2026-0142-ChenXi/commits/main/02-20Days-Challenge)
