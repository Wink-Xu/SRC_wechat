# SundayRunningClub 小程序技术方案

## 一、技术选型

| 层级 | 技术方案 | 说明 |
|------|----------|------|
| 前端 | 微信小程序原生 | 原生开发，无额外框架，学习成本低，性能最优 |
| 后端 | 微信云开发 | 云函数 + 云数据库 + 云存储，无需搭建服务器 |
| 支付 | 微信支付 | 小程序原生支持 |
| 数据库 | 云数据库 (NoSQL) | 微信云开发自带 |

### 1.1 技术优势

- **一站式开发**：无需购买服务器
- **天然集成**：微信登录、支付无缝对接
- **开发效率高**：减少运维成本
- **弹性扩展**：云开发自动扩容

## 二、项目结构

```
SRC_wechat/
├── miniprogram/              # 小程序前端
│   ├── app.js               # 小程序入口
│   ├── app.json             # 全局配置
│   ├── app.wxss             # 全局样式
│   ├── sitemap.json         # 站点地图
│   ├── pages/               # 页面
│   │   ├── index/           # 首页
│   │   ├── login/           # 登录页
│   │   ├── activities/      # 活动列表
│   │   ├── activity-detail/ # 活动详情
│   │   ├── activity-create/ # 创建活动
│   │   ├── points/          # 积分中心
│   │   ├── shop/            # 商城
│   │   ├── product-detail/  # 商品详情
│   │   ├── orders/          # 订单列表
│   │   ├── order-detail/    # 订单详情
│   │   ├── profile/         # 个人中心
│   │   ├── admin/           # 管理后台
│   │   └── members/         # 成员管理
│   ├── components/          # 公共组件
│   │   ├── activity-card/   # 活动卡片
│   │   ├── product-card/    # 商品卡片
│   │   ├── member-card/     # 成员卡片
│   │   ├── tab-bar/         # 底部导航
│   │   └── loading/         # 加载组件
│   ├── utils/               # 工具函数
│   │   ├── request.js       # 网络请求
│   │   ├── auth.js          # 权限验证
│   │   ├── util.js          # 通用工具
│   │   └── constants.js     # 常量定义
│   └── images/               # 静态图片
├── cloudfunctions/          # 云函数
│   ├── user/                # 用户相关
│   ├── activity/            # 活动相关
│   ├── points/               # 积分相关
│   ├── shop/                 # 商城相关
│   └── admin/                # 管理相关
├── docs/                    # 文档
│   ├── spec.md              # 需求分析
│   ├── plan.md              # 技术方案
│   └── task.md              # 任务列表
└── project.config.json      # 项目配置
```

## 三、数据库设计

### 3.1 用户表 (users)

```json
{
  "_id": "user_id",
  "openid": "微信openid",
  "nickname": "昵称",
  "phone": "手机号",
  "avatar": "头像URL",
  "role": "member|admin|leader",
  "status": "pending|approved|rejected",
  "points": 0,
  "created_at": "创建时间",
  "updated_at": "更新时间"
}
```

### 3.2 活动表 (activities)

```json
{
  "_id": "activity_id",
  "title": "活动标题",
  "description": "活动描述",
  "location": "集合地点",
  "start_time": "开始时间",
  "end_time": "结束时间",
  "quota": 20,
  "points": 10,
  "status": "draft|published|ongoing|ended|cancelled",
  "created_by": "创建者ID",
  "created_at": "创建时间",
  "updated_at": "更新时间"
}
```

### 3.3 报名表 (registrations)

```json
{
  "_id": "registration_id",
  "user_id": "用户ID",
  "activity_id": "活动ID",
  "status": "registered|checked_in|cancelled",
  "created_at": "报名时间",
  "checked_in_at": "签到时间"
}
```

### 3.4 商品表 (products)

```json
{
  "_id": "product_id",
  "name": "商品名称",
  "description": "商品描述",
  "image": "商品图片URL",
  "points_price": 100,
  "cash_price": 9900,
  "stock": 50,
  "status": "available|unavailable",
  "created_at": "创建时间",
  "updated_at": "更新时间"
}
```

### 3.5 订单表 (orders)

```json
{
  "_id": "order_id",
  "order_no": "订单编号",
  "user_id": "用户ID",
  "product_id": "商品ID",
  "quantity": 1,
  "total_points": 100,
  "total_cash": 0,
  "pay_method": "points|wechat",
  "status": "pending|paid|shipped|completed|cancelled",
  "address": {
    "name": "收货人",
    "phone": "手机号",
    "province": "省",
    "city": "市",
    "district": "区",
    "detail": "详细地址"
  },
  "created_at": "创建时间",
  "paid_at": "支付时间",
  "shipped_at": "发货时间"
}
```

### 3.6 积分记录表 (point_logs)

```json
{
  "_id": "log_id",
  "user_id": "用户ID",
  "points": 10,
  "type": "activity|exchange|admin",
  "related_id": "关联ID（活动ID或订单ID）",
  "remark": "备注",
  "created_at": "创建时间"
}
```

### 3.7 系统配置表 (settings)

```json
{
  "_id": "setting_id",
  "key": "配置键",
  "value": "配置值",
  "updated_at": "更新时间"
}
```

## 四、云函数设计

### 4.1 user 云函数

| 方法 | 说明 |
|------|------|
| login | 微信登录，获取用户信息 |
| updateProfile | 更新用户资料 |
| applyMembership | 申请入团 |
| getMembers | 获取成员列表 |
| approveMember | 审批成员申请 |
| setRole | 设置用户角色 |

### 4.2 activity 云函数

| 方法 | 说明 |
|------|------|
| create | 创建活动 |
| update | 更新活动 |
| publish | 发布活动 |
| cancel | 取消活动 |
| getList | 获取活动列表 |
| getDetail | 获取活动详情 |
| register | 报名活动 |
| cancelRegistration | 取消报名 |
| checkIn | 签到 |

### 4.3 points 云函数

| 方法 | 说明 |
|------|------|
| getBalance | 获取积分余额 |
| getLogs | 获取积分记录 |
| getRanking | 获取积分榜 |
| addPoints | 增加积分 |
| deductPoints | 扣除积分 |

### 4.4 shop 云函数

| 方法 | 说明 |
|------|------|
| getProductList | 获取商品列表 |
| getProductDetail | 获取商品详情 |
| createOrder | 创建订单 |
| payOrderByPoints | 积分支付 |
| payOrderByWechat | 微信支付 |
| getOrders | 获取订单列表 |
| updateOrderStatus | 更新订单状态 |

### 4.5 admin 云函数

| 方法 | 说明 |
|------|------|
| getStatistics | 获取统计数据 |
| manageProduct | 管理商品 |
| manageOrder | 管理订单 |
| manageActivity | 管理活动 |
| manageUser | 管理用户 |

## 五、权限控制

### 5.1 权限级别

```javascript
const ROLES = {
  GUEST: 'guest',     // 游客
  PENDING: 'pending', // 待审批
  MEMBER: 'member',   // 团员
  ADMIN: 'admin',     // 管理员
  LEADER: 'leader'    // 团长
}

const PERMISSIONS = {
  // 公开权限
  public: ['guest', 'pending', 'member', 'admin', 'leader'],

  // 团员权限
  member: ['member', 'admin', 'leader'],

  // 管理员权限
  admin: ['admin', 'leader'],

  // 团长权限
  leader: ['leader']
}
```

### 5.2 接口权限

| 接口 | 所需权限 |
|------|----------|
| 浏览活动列表 | public |
| 报名活动 | member |
| 查看积分 | member |
| 兑换商品 | member |
| 创建活动 | admin |
| 签到确认 | admin |
| 审批成员 | admin |
| 设置管理员 | leader |

## 六、页面设计

### 6.1 Tab Bar 页面

| 页面 | 图标 | 说明 |
|------|------|------|
| 首页 | home | 展示最新活动、公告 |
| 活动 | activity | 活动列表 |
| 商城 | shop | 周边商城 |
| 我的 | profile | 个人中心 |

### 6.2 页面流程

```
首页
  ├── 活动详情 → 活动报名
  ├── 登录 → 申请入团
  └── 积分榜

活动列表
  ├── 活动详情 → 活动报名
  └── 创建活动（管理员）

商城
  ├── 商品详情 → 下单 → 支付
  └── 订单列表

我的
  ├── 个人资料
  ├── 积分记录
  ├── 收货地址
  └── 管理后台（管理员）
```

## 七、测试方案

### 7.1 测试驱动开发 (TDD)

1. 先编写测试用例
2. 实现功能代码
3. 运行测试验证
4. 重构优化

### 7.2 测试类型

- 单元测试：云函数逻辑测试
- 集成测试：接口联调测试
- 端到端测试：用户流程测试

## 八、部署方案

### 8.1 开发环境

- 云开发环境 ID: 开发环境
- 数据库集合: 自动创建

### 8.2 生产环境

- 云开发环境 ID: 生产环境
- 数据库集合: 手动迁移

### 8.3 发布流程

1. 本地开发测试
2. 云函数部署
3. 小程序提审
4. 审核通过发布