# 《JSS → 会计系统字段级 & 科目级对照说明（QB / Xero）》

**适用会计系统**：

- **QuickBooks**

- **Xero**

**适用业务类型**：  
项目制装修 / 建筑 / 工程类公司

---

## 一、总体对接原则（会计必读）

### 原则 1｜**会计系统是唯一 Source of Truth**

- JSS **不覆盖**会计系统中的已存在记录

- 会计系统校验失败 → JSS 必须回滚并标记错误

### 原则 2｜**字段一一对应，不做“模糊合并”**

- 不自动猜科目

- 不在同步阶段做“聪明但危险”的转换

### 原则 3｜**所有关键字段可追溯**

- 项目

- 金额

- 税

- 修改记录（Audit Trail）

---

## 二、核心对象对照（Object Mapping）

### 1️⃣ 项目（Project）

| JSS 字段           | QuickBooks            | Xero                        | 说明         |
| ---------------- | --------------------- | --------------------------- | ---------- |
| `project_id`     | Customer / Project    | Contact / Tracking Category | 项目唯一标识     |
| `project_name`   | Customer:Project Name | Tracking Category Value     | 项目名称       |
| `project_status` | 非同步字段                 | 非同步字段                       | 仅 JSS 内部控制 |

📌 **会计说明**

- JSS 项目 ≠ 会计系统 Job

- 但在同步时 **强制一一对应**

---

### 2️⃣ 费用 / 收据（Expense / Receipt）

| JSS 字段         | QuickBooks         | Xero      | 说明         |
| -------------- | ------------------ | --------- | ---------- |
| `receipt_id`   | Bill / Expense Ref | Bill Ref  | 用于去重       |
| `vendor_name`  | Vendor             | Supplier  | 自动或人工标准化   |
| `total_cents`  | Amount             | Amount    | 分位制，避免浮点误差 |
| `currency`     | Currency           | Currency  | 多币种支持      |
| `receipt_date` | Expense Date       | Bill Date |            |
| `evidence_url` | Attachment         | File      | 原始凭证       |

---

## 三、成本归属逻辑（最重要）

### A️⃣ 项目成本（Project Cost）

**JSS 条件**

- `cost_type = project`

- `project_id ≠ null`

**会计映射**

| 会计系统       | 映射方式                                 |
| ---------- | ------------------------------------ |
| QuickBooks | Expense / Bill → 关联 Customer/Project |
| Xero       | Bill → Tracking Category = 项目        |

📌 **会计含义**

- 进入 Cost of Goods Sold（COGS）或项目成本科目

- 直接参与项目毛利计算

---

### B️⃣ 公司运营成本（Overhead / G&A）

**JSS 条件**

- `cost_type = overhead`

- `project_id = null`

**会计映射**

| 会计系统       | 映射方式                         |
| ---------- | ---------------------------- |
| QuickBooks | Expense → 无 Customer/Project |
| Xero       | Bill → 无 Tracking Category   |

📌 **会计含义**

- 进入期间费用

- 不影响单一项目毛利

---

## 四、税务字段对照（GST / PST / HST）

| JSS 字段          | QuickBooks            | Xero                  | 说明   |
| --------------- | --------------------- | --------------------- | ---- |
| `tax_type`      | Tax Code              | Tax Rate              | 明确税种 |
| `tax_cents`     | Tax Amount            | Tax Amount            | 精确金额 |
| `tax_inclusive` | Inclusive / Exclusive | Inclusive / Exclusive |      |

📌 **关键约束**

- 税务字段缺失 → **JSS 阻断同步**

- 税额逻辑不自洽 → **JSS 标红**

---

## 五、科目（Account）映射策略

### JSS 的立场（非常重要）

> **JSS 不直接决定会计科目，  
> 而是通过“成本属性”驱动科目选择。**

### 推荐会计配置（示例）

| 成本属性                | 推荐科目（QB/Xero）                    |
| ------------------- | -------------------------------- |
| Project Material    | COGS – Materials                 |
| Project Subcontract | COGS – Subcontract               |
| Project Delivery    | COGS – Delivery                  |
| Overhead – Software | Operating Expense – Software     |
| Overhead – Bank Fee | Operating Expense – Bank Charges |

📌 **说明**

- 科目由会计预先配置

- JSS 只传递 **分类意图 + 约束**

---

## 六、修改 / Override 的会计可见性

### 当用户在 JSS 中手动修改：

- 项目归属

- 税务类型

- 金额

**JSS 必须同步以下信息（或可查）**

- 修改前值

- 修改后值

- 修改人

- 修改时间

📌 **会计价值**

> 不是“系统说这是对的”，  
> 而是**知道是谁在为这条数负责**。

---

## 七、错误与冲突处理（会计安心点）

### 场景 1｜会计系统拒绝（Validation Fail）

- JSS 状态：`Server Rejected`

- 自动回滚

- 会计无需处理“半条账”

### 场景 2｜金额不一致

- JSS 冻结该记录

- 强制人工核对

- 不允许静默修正

---

## 八、对会计的三点承诺（可直接写给他们）

1. **不制造双账**

2. **不隐藏不确定性**

3. **不把“系统错误”转嫁给会计**

---

## 九、一句话总结（给会计）

> **JSS 的目标不是“替代会计判断”，  
> 而是“把会计判断前的垃圾清掉”。**

---

## 附录：常见会计问题（FAQ）

**Q：可以事后把 Overhead 分摊到项目吗？**  
A：默认不支持。需要启用高级分摊模块（未来版本）。

**Q：可以跳过项目直接入账吗？**  
A：不可以。未归属项目的项目成本不会同步。

**Q：JSS 会不会自动帮我选错科目？**  
A：不会。科目由会计预配置，JSS 只传递约束条件。
