# ITER-001 · 删除记录后新增会撞 ID

| 项 | 内容 |
|---|---|
| 发现日期 | 2026-11-11 |
| 依据日志 | `process_logs/telemetry_2026-11-10.log` 第 19–20 行、`process_logs/telemetry_2026-11-11.log` 第 1–8 行 |
| 修复提交 | 见本文第三节（`main.js`） |
| 验证日期 | **2026-11-13（待填，见第四节）** |
| 状态 | 已修复，待次日验证 |

---

## 一、日志证据（原文）

### 1.1 源事件：一次真实的删除

`process_logs/telemetry_2026-11-10.log` 第 20 行：

```json
{"seq":28,"ts":"2026-11-10T19:22:18.398+08:00","action":"delete","details":"id=4, amount=13","elapsed_ms":1,"error":"","prev_hash":"3c3d578b...","hash":"852d002e..."}
```

这次删除的对象是一条**误记记录**（把占位示例金额 13 元当真实消费记入后撤销）。删除本身正确，问题在后面。

### 1.2 次日新增：ID 与既有记录重复

`process_logs/telemetry_2026-11-11.log` 第 2 行：

```json
{"seq":32,"ts":"2026-11-11T17:16:57.744+08:00","action":"add","details":"amount=3, category=餐饮","elapsed_ms":57,"error":"","prev_hash":"c4cd04b1...","hash":"ab7cd4e9..."}
```

这条新增写入 `data/expenses.json` 时，`id` 取到了 **6**，而 11-10 的晚餐记录 id 也是 6：

```
修复前的 id 序列： [1, 2, 3, 5, 6, 6, 7, 8]
重复 id：          6
  id=6  15 元  2026-11-10  晚餐
  id=6   3 元  2026-11-11  早餐
```

**后果**：`node app.js delete 6` 会删掉 `findIndex` 找到的第一条（11-10 的 15 元晚餐），而不是用户想删的那条。这是一条会**静默删错数据**的缺陷。

### 1.3 定位

`main.js` 三处新增逻辑（`addExpense` / `batchAdd` / `addExpenseWithDate`）均使用：

```js
data.expenses.push({ id: data.expenses.length + 1, ... });
```

`expenses.length` 是**当前存活记录数**，删除任意一条就会回退 1，而历史最大 ID 不回退。二者一旦不同步，新 ID 必然与仍存在的记录撞号。

---

## 二、我的假设（可被证伪）

> **假设**：ID 冲突的根因是「用数组长度当 ID」，而不是并发写入或数据文件损坏。
> 若改用「现有最大 ID + 1」，则删除任意记录后再新增，ID 不会重复。

**可证伪的实验**：构造「删除中间一条 → 再新增」的操作序列，检查新增记录的 ID 是否与现存记录冲突。
- 若仍冲突 → 假设错误，根因在别处（需检查 `saveData` 写入时序或文件编码）。
- 若不冲突 → 假设成立。

（此实验已于 2026-11-12 在临时副本中执行，结果见第三节 3.3。）

---

## 三、改了什么

### 3.1 改动位置

`main.js`，共两处新增、三处替换：

| 位置 | 改动 |
|---|---|
| 新增 `nextId(expenses)` | 取现有最大 ID + 1，替代 `expenses.length + 1` |
| 新增 `repairDuplicateIds(data)` | 一次性修复历史数据中的重复 ID（按 `date` + 时间部分升序重排为 1..N） |
| `loadData()` | 解析后调用修复逻辑；修复动作本身**放在 `try` 之外**，避免修复异常被误判为「数据文件损坏」而触发改名备份 |
| `addExpense` / `batchAdd` / `addExpenseWithDate` | `id: data.expenses.length + 1` → `id: nextId(data.expenses)` |

### 3.2 关键 diff

```diff
+function nextId(expenses) {
+  return expenses.reduce(function (max, e) {
+    const n = Number(e.id);
+    return Number.isFinite(n) && n > max ? n : max;
+  }, 0) + 1;
+}
+
+function repairDuplicateIds(data) {
+  ...
+  // created_at 是 zh-CN 的 '2026/11/9 19:19:17'，日、月不补零，
+  // 直接按字符串排序会把 11-10 排到 11-9 前面。因此用 date + 时间部分作排序键。
+  function sortKey(e) {
+    const t = String(e.created_at || '');
+    const timePart = t.indexOf(' ') >= 0 ? t.split(' ').pop() : '00:00:00';
+    return String(e.date || '') + ' ' + timePart;
+  }
+  ...
+}

-    data.expenses.push({ id: data.expenses.length + 1, ... });
+    data.expenses.push({ id: nextId(data.expenses), ... });
```

### 3.3 临时副本中的验证（改代码当天做，不算次日验证）

在 `/tmp` 下的副本中，用真实数据（含重复 id=6）执行：

| 步骤 | 结果 |
|---|---|
| 触发 `loadData()` | `[WARN] 检测到 1 条重复 ID，已按时间顺序重新编号 1..8` |
| 修复后 id 序列 | `[1,2,3,4,5,6,7,8]`，顺序与日期一致，无重复 |
| 新增一条 | 得到 `id=9`（最大 + 1，正确） |
| 删除 id=5 后再新增 | 得到 `id=10`，**无重复**（旧逻辑此处会生成 9，与已有 9 撞号） |

### 3.4 放弃的方案

| 方案 | 放弃原因 |
|---|---|
| 用时间戳/UUID 作 ID | `delete` / `modify` 需要人手工输入 ID，长串不可输入；命令行工具应保持短整型 |
| 删除后不重排、允许 ID 断档 | **这正是本次采用的 `max+1` 方案**，断档无害，重排有害（会改动历史记录的标识） |
| 每次删除后重编号全部记录 | 会让 `delete 5` 之类的历史操作记录失去意义，且用户已记住的 ID 会变，体验更差 |

**已知副作用**：修复历史重复 ID 时会重写全部记录的 `id`（1..N），但记录内容、金额、日期、顺序均不变，且 `id` 没有被任何外部文件引用（`process_logs` 里存的是操作时的数值，属历史事实，不回改）。

---

## 四、次日验证结果（2026-11-13 填写，当天不得编）

> 本节在 2026-11-13 由本人实际操作后填写，不预先编写。

**验证方法**（已预先确定）：

1. 正常记 1~2 笔账，确认新增记录 ID 连续且不与现存记录重复；
2. 执行一次 `delete <中间ID>`，再新增一笔，确认新 ID = 删除前的最大 ID + 1；
3. 跑 `node src/verify_chain.js`，确认日志链仍为 `[PASS]`；
4. 检查 `data/expenses.json` 中 id 无重复。

**结果**：〔待 2026-11-13 填写〕

**下一步**：〔待填写〕
