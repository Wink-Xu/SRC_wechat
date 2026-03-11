# Mock 模式使用指南

## 概述

由于微信测试号不支持云开发，我们实现了本地 Mock 数据模式，可以在不开启云开发的情况下进行 UI 开发和测试。

## 页面结构

小程序采用三 Tab 结构：

| Tab | 页面路径 | 功能 |
|-----|---------|------|
| 活动 | `pages/activities/activities` | 活动列表、活动详情、活动报名 |
| 周边 | `pages/shop/shop` | 商品列表、商品详情、积分兑换/购买 |
| 我的 | `pages/profile/profile` | 用户信息、积分中心、我的订单、管理后台 |

## 配置方式

### 1. 全局 Mock 开关

在 `miniprogram/app.js` 中设置：

```javascript
App({
  USE_MOCK: true,  // true = 使用本地模拟数据，false = 使用云开发
  // ...
});
```

### 2. API 层 Mock 开关

在 `miniprogram/utils/request.js` 中设置：

```javascript
const USE_MOCK = true;  // true = 使用本地模拟数据，false = 使用云函数
```

## Mock 数据

模拟数据位于 `miniprogram/utils/mock-data.js`，包含：

### 用户数据
- 当前登录用户：`currentUser`（测试用户，500 积分，团员身份）

### 活动数据
- 4 个模拟活动：周末晨跑、夜跑、PB 挑战、越野跑

### 商品数据
- 6 个模拟商品：T 恤、腰包、手环、毛巾、水壶、帽子

### 积分数据
- 5 条积分记录
- 5 人积分榜

### 成员数据
- 5 个成员（含待审批用户）

## Mock API 接口

所有云函数调用都会被拦截并返回模拟数据：

| 模块 | 支持的方法 |
|------|----------|
| userApi | login, updateProfile, applyMembership, getMembers, approveMember, setRole |
| activityApi | getList, getDetail, create, update, publish, cancel, register, cancelRegistration, checkIn |
| pointsApi | getBalance, getLogs, getRanking, addPoints, deductPoints |
| shopApi | getProductList, getProductDetail, createOrder, payOrderByPoints, payOrderByWechat, getOrders, cancelOrder, confirmReceipt |
| adminApi | getStatistics, getPendingMembers, manageProduct, updateOrderStatus, getOrders |

## 使用场景

### UI 开发阶段
- ✅ 使用 Mock 模式（`USE_MOCK = true`）
- ✅ 无需配置云开发
- ✅ 快速原型开发和 UI 测试

### 集成测试阶段
- ✅ 切换到云开发模式（`USE_MOCK = false`）
- ✅ 需要配置云开发环境 ID
- ✅ 部署云函数到云端

## 切换模式

### 从 Mock 模式切换到云开发模式

1. 修改 `miniprogram/app.js`：
   ```javascript
   USE_MOCK: false
   ```

2. 修改 `miniprogram/utils/request.js`：
   ```javascript
   const USE_MOCK = false;
   ```

3. 在 `app.js` 中配置正确的云环境 ID：
   ```javascript
   wx.cloud.init({
     env: 'your-env-id',  // 替换为实际环境 ID
     traceUser: true
   });
   ```

4. 部署所有云函数到云端

## 控制台日志

Mock 模式下会输出日志帮助调试：

```
[Mock Mode] 使用本地模拟数据，不初始化云开发
[Mock API] activity.getList { status: 'published', limit: 3 }
[Mock API] points.getBalance {}
```

## 限制

Mock 模式的限制：

1. ❌ 不支持真实的微信登录（使用模拟用户数据）
2. ❌ 不支持真实的微信支付
3. ❌ 不支持真实的图片上传
4. ❌ 数据修改不会持久化（重启后恢复初始状态）
5. ❌ 不支持订阅消息推送

## 下一步

完成 UI 开发和测试后，需要：

1. 开通正式小程序账号（非测试号）
2. 开通云开发服务
3. 部署云函数
4. 初始化数据库
5. 切换到云开发模式进行集成测试
