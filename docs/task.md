# SundayRunningClub 小程序开发任务

## 开发方式：测试驱动开发 (TDD)

1. 先编写测试用例
2. 实现功能代码
3. 运行测试验证
4. 重构优化

---

## 当前状态

**Mock 模式开发阶段** - 使用本地模拟数据进行 UI 开发

由于微信测试号不支持云开发，当前阶段使用 Mock 数据进行开发和测试。

---

## Phase 1: 项目初始化 ✅ 已完成

### 1.1 项目结构 ✅
- [x] 创建小程序目录结构
- [x] 配置 app.json（3 Tab：活动、周边、我的）
- [x] 配置 project.config.json
- [x] 创建公共样式 app.wxss（紫色主题）

### 1.2 Mock 模式配置 ✅
- [x] 设置 USE_MOCK 开关
- [x] 创建 mock-data.js（用户、活动、商品、积分数据）
- [x] 实现 Mock API 层（request.js）
- [x] 创建 Mock 模式使用指南

---

## Phase 2: 用户模块

### 2.1 测试用例
- [ ] 登录接口测试
- [ ] 用户信息更新测试
- [ ] 入团申请测试
- [ ] 申请审批测试
- [ ] 权限验证测试

### 2.2 功能实现
- [x] 微信登录页面（支持 Mock 模式）
- [ ] 登录云函数（Mock 模式已完成）
- [x] 用户信息填写页面
- [ ] 入团申请云函数（Mock 模式已完成）
- [x] 申请审批页面（管理员）
- [x] 权限验证中间件（auth.js）

---

## Phase 3: 活动模块

### 3.1 测试用例
- [ ] 活动创建测试
- [ ] 活动列表查询测试
- [ ] 活动详情查询测试
- [ ] 活动报名测试
- [ ] 取消报名测试
- [ ] 签到测试
- [ ] 名额限制测试

### 3.2 功能实现 ✅
- [x] 活动列表页面（Tab 首页）
- [x] 活动详情页面
- [x] 活动创建页面（管理员）
- [x] 活动相关云函数（Mock 模式）
- [ ] 活动卡片组件
- [ ] 签到管理页面（管理员）

---

## Phase 4: 积分模块

### 4.1 测试用例
- [ ] 积分发放测试
- [ ] 积分扣除测试
- [ ] 积分查询测试
- [ ] 积分榜查询测试
- [ ] 积分记录查询测试

### 4.2 功能实现
- [x] 积分自动发放逻辑（Mock 模式）
- [x] 积分中心页面
- [x] 积分记录页面
- [x] 积分榜页面
- [ ] 积分相关云函数（Mock 模式已完成）

---

## Phase 5: 商城模块

### 5.1 测试用例
- [ ] 商品列表查询测试
- [ ] 商品详情查询测试
- [ ] 订单创建测试
- [ ] 积分支付测试
- [ ] 库存扣减测试
- [ ] 订单状态流转测试

### 5.2 功能实现 ✅
- [x] 商城首页（Tab 页面）
- [x] 商品详情页面
- [ ] 下单页面
- [ ] 收货地址管理
- [x] 订单列表页面
- [x] 订单详情页面
- [ ] 商城相关云函数（Mock 模式已完成）

---

## Phase 6: 支付集成

### 6.1 测试用例
- [ ] 微信支付下单测试
- [ ] 支付回调处理测试
- [ ] 支付状态查询测试

### 6.2 功能实现
- [ ] 微信支付云函数
- [ ] 支付回调处理
- [ ] 支付状态页面

---

## Phase 7: 管理后台

### 7.1 测试用例
- [ ] 管理员权限测试
- [ ] 成员管理测试
- [ ] 活动管理测试
- [ ] 商品管理测试
- [ ] 订单管理测试

### 7.2 功能实现
- [ ] 管理后台首页
- [ ] 成员管理页面
- [ ] 活动管理页面
- [ ] 商品管理页面
- [ ] 订单管理页面
- [ ] 统计数据展示

---

## Phase 8: 优化与测试

### 8.1 性能优化
- [ ] 图片懒加载
- [ ] 列表分页加载
- [ ] 云函数性能优化
- [ ] 数据库索引优化

### 8.2 体验优化 ✅
- [x] 加载状态提示
- [x] 错误处理提示
- [x] 空状态页面
- [x] 下拉刷新
- [x] 上拉加载更多

### 8.3 最终测试
- [ ] 完整用户流程测试
- [ ] 异常情况测试
- [ ] 边界条件测试
- [ ] 兼容性测试

---

## 数据库集合创建清单

| 集合名称 | 说明 |
|----------|------|
| users | 用户表 |
| activities | 活动表 |
| registrations | 报名表 |
| products | 商品表 |
| orders | 订单表 |
| point_logs | 积分记录表 |
| settings | 系统配置表 |

---

## 云函数创建清单

| 云函数 | 方法列表 |
|--------|----------|
| user | login, updateProfile, applyMembership, getMembers, approveMember, setRole |
| activity | create, update, publish, cancel, getList, getDetail, register, cancelRegistration, checkIn |
| points | getBalance, getLogs, getRanking, addPoints, deductPoints |
| shop | getProductList, getProductDetail, createOrder, payOrderByPoints, getOrders, updateOrderStatus |
| admin | getStatistics, manageProduct, manageOrder, manageActivity, manageUser |