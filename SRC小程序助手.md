# SRC 小程序助手

## 项目简介

SundayRunningClub (SRC) 小程序是一款专为武汉先锋跑团设计的微信小程序，实现活动管理、积分系统、周边商城等核心功能。

**Slogan**: In the soil of SRC we grow into our better selves.

- **S** - Soil（成长的土壤）
- **R** - Rise（向上的态度）
- **C** - Cohesion（凝聚的纽带）

---

## 技术架构

### 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | 微信小程序原生 | 原生开发，无额外框架 |
| 后端 | 微信云开发 | 云函数 + 云数据库 + 云存储 |
| 支付 | 微信支付 | 小程序原生支持 |

### 项目结构

```
SRC_wechat/
├── miniprogram/                    # 小程序前端
│   ├── pages/                      # 页面目录
│   │   ├── activities/             # 活动列表
│   │   ├── activity-detail/        # 活动详情
│   │   ├── activity-create/        # 创建活动
│   │   ├── activity-participants/  # 报名名单
│   │   ├── my-activities/          # 我的活动
│   │   ├── scan-checkin/           # 扫码签到
│   │   ├── shop/                   # 周边商城
│   │   ├── product-detail/         # 商品详情
│   │   ├── orders/                 # 我的订单
│   │   ├── order-detail/           # 订单详情
│   │   ├── address-edit/           # 地址编辑
│   │   ├── points/                 # 积分记录
│   │   ├── points-rank/            # 积分排行
│   │   ├── profile/                # 个人中心
│   │   ├── apply-membership/       # 申请入团
│   │   ├── admin/                  # 管理后台入口
│   │   ├── admin-members/          # 成员管理
│   │   ├── admin-activities/       # 活动管理
│   │   ├── admin-products/         # 商品管理
│   │   ├── admin-orders/           # 订单管理
│   │   ├── init/                   # 初始化页面
│   │   ├── debug/                  # 调试工具
│   │   ├── debug-db/               # 数据库调试
│   │   └── test-panel/             # 测试面板
│   ├── utils/                      # 工具类
│   │   ├── request.js              # 云函数请求封装
│   │   ├── auth.js                 # 权限验证
│   │   └── util.js                 # 通用工具
│   ├── components/                 # 公共组件
│   ├── images/                     # 图片资源
│   └── app.js                      # 小程序入口
│
├── cloudfunctions/                 # 云函数目录
│   ├── user/                       # 用户管理
│   ├── activity/                   # 活动管理
│   ├── points/                     # 积分管理
│   ├── shop/                       # 商城管理
│   ├── admin/                      # 管理后台
│   ├── init/                       # 初始化工具
│   ├── debug/                      # 调试工具
│   ├── test-user/                  # 测试用户管理
│   └── test-data/                  # 测试数据管理
│
└── project.config.json             # 项目配置
```

---

## 功能模块

### 一、用户系统

#### 用户角色

| 角色 | 权限说明 |
|------|----------|
| 团长 | 最高权限：任命/撤销管理员、解散跑团、设置规则、所有管理员权限 |
| 管理员 | 发布活动、审核报名、签到确认、管理积分、审核新成员、管理周边商品 |
| 团员 | 报名活动、查看积分、兑换周边、查看积分榜 |
| 待审批 | 已提交申请，等待管理员审核 |
| 游客 | 可浏览公开信息，无法报名活动 |

#### 用户流程

```
游客 → 登录 → 填写信息 → 申请入团 → 管理员审批 → 成为团员
```

### 二、活动管理

#### 活动类型

- 路跑
- 越野跑
- 徒步
- 品牌合作跑

#### 活动状态

| 状态 | 说明 |
|------|------|
| 草稿 | 未发布，仅创建者可见 |
| 报名中 | 已发布，团员可报名 |
| 进行中 | 活动进行中 |
| 已结束 | 活动已结束 |
| 已取消 | 活动已取消 |

#### 功能流程

1. **发布活动** - 管理员创建活动，设置时间、地点、名额、积分值
2. **活动报名** - 团员报名，有名额限制
3. **取消报名** - 团员可自由取消
4. **扫码签到** - 活动现场扫码确认参与
5. **积分发放** - 签到后自动发放该活动对应的积分

#### 签到系统

- 管理员在活动管理页生成签到码
- 团员在活动详情页扫码签到
- 签到成功后活动结束自动获得积分

### 三、积分系统

#### 积分获取

- 参加活动签到后获得
- 不同活动类型可设置不同积分值

#### 积分特性

- 永久有效，持续累积
- 可用于兑换周边商品

#### 积分榜

- 展示团员积分排名
- 激励参与热情

### 四、周边商城

#### 商品属性

- 商品图片、名称、描述
- 库存数量
- 积分价格 / 现金价格

#### 购买方式

- 积分兑换（消耗积分）
- 微信支付购买（现金）

#### 订单流程

```
选择商品 → 确认订单 → 支付/兑换 → 填写地址 → 等待发货 → 确认收货
```

### 五、管理后台

小程序内嵌管理后台，管理员可进行：

- **成员管理** - 审核新成员、查看成员列表、调整角色
- **活动管理** - 创建/编辑/删除活动、查看报名名单、生成签到码
- **商品管理** - 添加/编辑/下架商品、管理库存
- **订单管理** - 处理订单、标记发货

---

## 数据库设计

### 用户表

| 字段 | 类型 | 说明 |
|------|------|------|
| _id | string | 用户 ID |
| openid | string | 微信 openid |
| nickname | string | 昵称 |
| phone | string | 手机号 |
| avatar | string | 头像 URL |
| role | string | 角色：leader/admin/member |
| status | string | 状态：approved/pending/guest |
| points | number | 积分 |
| created_at | date | 创建时间 |

### 活动表

| 字段 | 类型 | 说明 |
|------|------|------|
| _id | string | 活动 ID |
| title | string | 活动标题 |
| description | string | 活动描述 |
| cover_image | string | 封面图 |
| location | string | 集合地点 |
| start_time | date | 开始时间 |
| end_time | date | 结束时间 |
| registration_deadline | date | 报名截止时间 |
| quota | number | 名额限制 |
| points | number | 积分值 |
| run_type | string | 跑步类型 |
| status | string | 状态 |
| photos | array | 活动照片 |
| created_by | string | 创建者 ID |

### 报名表

| 字段 | 类型 | 说明 |
|------|------|------|
| _id | string | 报名 ID |
| user_id | string | 用户 ID |
| activity_id | string | 活动 ID |
| status | string | 状态：registered/checked_in/cancelled |
| checked_in_at | date | 签到时间 |
| created_at | date | 报名时间 |

### 商品表

| 字段 | 类型 | 说明 |
|------|------|------|
| _id | string | 商品 ID |
| name | string | 商品名称 |
| description | string | 商品描述 |
| image | string | 商品图片 |
| points_price | number | 积分价格 |
| cash_price | number | 现金价格 |
| stock | number | 库存 |
| status | string | 状态：active/inactive |

### 订单表

| 字段 | 类型 | 说明 |
|------|------|------|
| _id | string | 订单 ID |
| user_id | string | 用户 ID |
| product_id | string | 商品 ID |
| quantity | number | 数量 |
| total_points | number | 积分总额 |
| total_cash | number | 现金总额 |
| status | string | 状态：pending/paid/shipped/completed |
| address | object | 收货地址 |
| created_at | date | 创建时间 |

### 积分记录表 (point_logs)

| 字段 | 类型 | 说明 |
|------|------|------|
| _id | string | 记录 ID |
| user_id | string | 用户 ID |
| points | number | 积分变动（正/负） |
| type | string | 类型：activity/exchange/admin |
| related_id | string | 关联 ID |
| remark | string | 备注 |
| created_at | date | 创建时间 |

---

## 开发指南

### 环境要求

- 微信开发者工具
- Node.js 14+
- 已开通微信云开发

### 本地开发

1. 克隆项目到本地
2. 用微信开发者工具打开项目
3. 配置云开发环境
4. 部署云函数
5. 编译运行

### 云函数部署

```bash
# 部署单个云函数
/Applications/wechatwebdevtools.app/Contents/MacOS/cli cloud functions deploy \
  --env "cloud1-2gyhe7s5efa4155f" \
  --names "activity" \
  --project "/Users/xu/Documents/SRC_wechat"

# 查看云函数列表
/Applications/wechatwebdevtools.app/Contents/MacOS/cli cloud functions list \
  --env "cloud1-2gyhe7s5efa4155f" \
  --project "/Users/xu/Documents/SRC_wechat"
```

### 代码规范

- 函数定义使用 `functionName: async function () {}` 格式
- 云函数通过 `event.action` 区分不同操作
- 使用 `const { showSuccess } = require('../../utils/util')` 引入工具函数

---

## 测试工具

### 测试用户

| ID | 角色 | 用途 |
|----|------|------|
| leader | 团长 | 测试最高权限功能 |
| admin | 管理员 | 测试管理功能 |
| member1-3 | 团员 | 测试普通用户功能 |
| pending | 待审批 | 测试审核流程 |
| guest | 游客 | 测试未登录状态 |

### 快速切换用户

1. 进入"我的"页面
2. 点击"测试工具面板"
3. 点击任意用户卡片切换身份

---

## 更新日志

### v1.0.0

- 用户登录、入团申请、审批流程
- 活动发布、报名、签到
- 积分系统
- 周边商城
- 管理后台

---

## 联系方式

- 项目路径：`/Users/xu/Documents/SRC_wechat`
- AppID：`wxfab0c5bd74364f44`
- 云环境 ID：`cloud1-2gyhe7s5efa4155f`