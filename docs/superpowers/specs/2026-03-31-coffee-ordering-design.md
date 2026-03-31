# 咖啡点单功能设计文档

> **目标：** 在 SundayRunningClub 小程序中新增咖啡点单模块，支持用户浏览咖啡商品、加入购物车、选择温度、多种方式支付（现金/积分/余额），以及充值套餐余额管理。

---

## 1. 概述

### 1.1 背景

SundayRunningClub 小程序现有活动报名、周边商城、积分系统。现需新增咖啡点单业务，支持门店咖啡销售和充值套餐。

### 1.2 入口方式

- TabBar 新增第四个 tab「咖啡」
- TabBar 顺序：活动 | 周边 | 咖啡 | 我的

### 1.3 核心功能

- 咖啡商品浏览（分类展示）
- 购物车管理
- 温度选择（冷/热）
- 多种支付方式（现金、积分、余额）
- 充值套餐购买与余额管理
- 咖啡订单独立管理
- 管理后台商品与订单管理

---

## 2. 数据结构

### 2.1 咖啡商品表 `coffee_products`

```javascript
{
  _id: String,
  name: String,              // 咖啡名称
  category: String,          // 分类：americano/latte/special/decaf/pour_over/recharge
  price: Number,             // 价格（分）
  points_price: Number,      // 积分价格（可选，null 表示不支持积分）
  temperature: String,       // 温度选项：both/cold_only/hot_only
  description: String,       // 描述（可选）
  image: String,             // 图片 URL（可选）
  is_available: Boolean,     // 是否上架
  sort_order: Number,        // 排序权重（越小越靠前）

  // 充值套餐专用字段
  is_recharge: Boolean,      // 是否是充值套餐
  recharge_type: String,     // americano/any（美式套餐/任意套餐）
  recharge_count: Number     // 包含杯数（如 10）
}
```

**分类枚举：**
- `americano` - 美式
- `latte` - 拿铁
- `special` - 特调
- `decaf` - 无咖啡因
- `pour_over` - 单品手冲
- `recharge` - 充值套餐

**温度选项枚举：**
- `both` - 冷热可选
- `cold_only` - 仅冷
- `hot_only` - 仅热

### 2.2 咖啡订单表 `coffee_orders`

```javascript
{
  _id: String,
  user_id: String,
  user_openid: String,
  order_no: String,          // 订单号（如：CF20260331001）
  items: [{
    product_id: String,
    product_name: String,
    temperature: String,     // cold/hot
    price: Number,           // 单价（分）
    quantity: Number         // 数量
  }],
  total_amount: Number,      // 总金额（分）
  total_quantity: Number,    // 总杯数

  // 支付信息
  payment_type: String,      // cash/points/balance/mixed
  points_used: Number,       // 使用积分数
  cash_paid: Number,         // 现金支付金额（分）
  balance_used: {
    americano: Number,       // 美式余额抵扣杯数
    any: Number              // 任意余额抵扣杯数
  },

  status: String,            // pending/paid/completed/cancelled
  store_name: String,        // 门店名称（固定）
  store_address: String,     // 门店地址（固定）

  created_at: Date,
  paid_at: Date,
  completed_at: Date
}
```

**订单状态流转：**
- `pending` - 待支付
- `paid` - 已支付
- `completed` - 已完成（用户已取餐）
- `cancelled` - 已取消

### 2.3 咖啡余额表 `coffee_balances`

```javascript
{
  _id: String,
  user_id: String,
  americano_balance: Number, // 美式套餐剩余杯数
  any_balance: Number,       // 任意套餐剩余杯数
  updated_at: Date
}
```

---

## 3. 页面设计

### 3.1 新增页面

| 页面 | 路径 | 功能描述 |
|------|------|---------|
| 咖啡点单页 | `pages/coffee/coffee` | 分类 Tab、商品列表、加购、购物车入口 |
| 购物车页 | `pages/coffee-cart/coffee-cart` | 商品列表、温度修改、数量调整、结算 |
| 咖啡订单列表 | `pages/coffee-orders/coffee-orders` | 用户的历史咖啡订单 |
| 咖啡订单详情 | `pages/coffee-order-detail/coffee-order-detail` | 单个订单详情、支付状态 |

### 3.2 咖啡点单页布局

```
┌─────────────────────────────┐
│ 门店信息                     │
│ And then                     │
│ 上海爱琴海·缤纷里店           │
├─────────────────────────────┤
│ 分类 Tab（水平滚动）          │
│ [美式] [拿铁] [特调] [无咖啡因] [单品手冲] [充值套餐] │
├─────────────────────────────┤
│ 商品列表                     │
│ ┌─────────────────────────┐ │
│ │ 美式（冷/热）      ￥16 [+]│ │
│ │ 葡萄气泡美式（冷）  ￥18 [+]│ │
│ │ ...                     │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ 底部购物车栏                 │
│ [🛒 2] 合计: ￥44  [去结算]  │
└─────────────────────────────┘
```

### 3.3 温度选择弹窗

点击「+」后弹出：
- 如果 `temperature === 'both'`：显示「冷」「热」两个按钮
- 如果 `temperature === 'cold_only'`：仅显示「冷」，自动确认加入
- 如果 `temperature === 'hot_only'`：仅显示「热」，自动确认加入

### 3.4 个人中心调整

在「我的」页面新增：
- 「咖啡余额」入口 - 显示美式余额、任意余额
- 「咖啡订单」入口 - 跳转到咖啡订单列表

---

## 4. 业务流程

### 4.1 点单流程

```
用户进入咖啡页
    ↓
选择分类 Tab
    ↓
点击商品「+」按钮
    ↓
弹窗选择温度 → 加入购物车
    ↓
点击购物车 → 进入购物车页
    ↓
调整数量、修改温度、查看金额
    ↓
点击「结算」
    ↓
选择支付方式
    ├─ 现金支付 → 微信支付
    ├─ 积分支付 → 扣除积分
    └─ 余额支付 → 检测并使用对应余额
    ↓
支付成功 → 生成订单
    ↓
跳转订单详情页
```

### 4.2 余额抵扣逻辑

结算时系统自动检测余额：

1. **美式类商品**（category === 'americano'）：
   - 优先使用「美式余额」
   - 美式余额不足时，可使用「任意余额」
   - 余额不足部分需现金/积分补足

2. **非手冲商品**（category !== 'pour_over'）：
   - 使用「任意余额」
   - 余额不足部分需现金/积分补足

3. **手冲商品**（category === 'pour_over'）：
   - 不可使用任何余额
   - 仅支持现金/积分支付

### 4.3 充值套餐购买流程

用户购买充值套餐后：
1. 支付成功
2. 查询 `coffee_balances` 表，若无记录则创建
3. 根据套餐类型增加对应余额：
   - 美式套餐：`americano_balance += 10`
   - 任意套餐：`any_balance += 10`

---

## 5. 云函数设计

### 5.1 新建 `coffee` 云函数

| Action | 功能 | 参数 | 返回 |
|--------|------|------|------|
| `getProducts` | 获取商品列表 | `category`（可选） | `{ list: [Product] }` |
| `getProductDetail` | 获取商品详情 | `id` | `{ product: Product }` |
| `createOrder` | 创建订单 | `items: [{product_id, temperature, quantity}]` | `{ order_id, order_no }` |
| `payOrder` | 支付订单 | `order_id`, `payment_type` | `{ success: true }` |
| `getOrders` | 获取订单列表 | `page`, `limit` | `{ list: [Order], total }` |
| `getOrderDetail` | 获取订单详情 | `id` | `{ order: Order }` |
| `getBalance` | 获取用户余额 | - | `{ americano: Number, any: Number }` |
| `cancelOrder` | 取消订单 | `order_id` | `{ success: true }` |

### 5.2 支付实现

**现金支付：** 复用 `shop` 云函数中的微信支付逻辑（调用 `wx.requestPayment`）

**积分支付：** 调用 `points` 云函数的 `deduct` action 扣除积分

**余额支付：** 直接操作 `coffee_balances` 表，扣减对应杯数

---

## 6. 管理后台

### 6.1 新增页面

| 页面 | 路径 | 功能 |
|------|------|------|
| 咖啡商品管理 | `pages/admin-coffee/admin-coffee` | 商品列表、上下架、编辑入口 |
| 咖啡商品编辑 | `pages/admin-coffee-edit/admin-coffee-edit` | 新增/编辑商品 |
| 咖啡订单管理 | `pages/admin-coffee-orders/admin-coffee-orders` | 订单列表、状态管理 |

### 6.2 商品编辑字段

- 商品名称（必填）
- 分类（下拉选择）
- 价格（元）
- 积分价格（可选，留空则不支持积分）
- 温度选项（下拉：冷热可选/仅冷/仅热）
- 商品图片（可选）
- 商品描述（可选）
- 是否上架（开关）
- 排序权重（数字）

**充值套餐额外字段：**
- 套餐类型（美式/任意）
- 包含杯数

---

## 7. 初始商品数据

### 7.1 美式（americano）

| 名称 | 价格 | 温度 |
|------|------|------|
| 美式 | ￥16 | 冷热可选 |
| 葡萄气泡美式 | ￥18 | 仅冷 |
| 菠萝气泡美式 | ￥18 | 仅冷 |

### 7.2 拿铁（latte）

| 名称 | 价格 | 温度 |
|------|------|------|
| 拿铁 | ￥26 | 冷热可选 |
| 生椰拿铁 | ￥28 | 冷热可选 |
| 香草拿铁 | ￥28 | 冷热可选 |
| 西班牙拿铁 | ￥28 | 冷热可选 |
| 焦糖拿铁 | ￥28 | 冷热可选 |
| 话梅拿铁 | ￥28 | 冷热可选 |

### 7.3 特调（special）

| 名称 | 价格 | 温度 |
|------|------|------|
| 橘皮拿铁 | ￥30 | 仅冷 |
| 开心果拿铁 | ￥30 | 仅冷 |
| 黑芝麻拿铁 | ￥30 | 仅冷 |
| 路易波士鸳鸯拿铁 | ￥30 | 仅冷 |
| 曼谷咖啡拿铁 | ￥30 | 仅冷 |

### 7.4 无咖啡因（decaf）

| 名称 | 价格 | 温度 |
|------|------|------|
| 抹茶拿铁 | ￥26 | 冷热可选 |
| 路易波士茶拿铁 | ￥26 | 冷热可选 |
| 姜黄拿铁 | ￥26 | 冷热可选 |

### 7.5 单品手冲（pour_over）

| 名称 | 价格 | 温度 |
|------|------|------|
| 单品手冲 | ￥35 | 仅热 |

### 7.6 充值套餐（recharge）

| 名称 | 价格 | 类型 | 杯数 |
|------|------|------|------|
| 美式套餐 | ￥138 | 美式 | 10杯 |
| 任意套餐 | ￥218 | 任意 | 10杯 |

---

## 8. 门店信息（固定）

- **门店名称：** And then
- **门店地址：** 上海爱琴海·缤纷里店

---

## 9. 技术要点

### 9.1 无库存管理

咖啡为现制饮品，不设置库存数量限制。

### 9.2 价格存储

所有价格以「分」为单位存储，显示时转换为「元」。

### 9.3 订单号生成

格式：`CF` + 年月日 + 3位序号，如 `CF20260331001`

### 9.4 购物车存储

购物车数据存储在本地 `wx.setStorageSync`，不持久化到云端。

---

## 10. 后续扩展（不在本期范围）

- 多门店支持
- 优惠券/折扣码
- 会员等级
- 咖啡口味定制（糖度、冰量）