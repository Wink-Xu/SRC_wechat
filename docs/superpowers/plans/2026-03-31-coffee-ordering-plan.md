# 咖啡点单功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 SundayRunningClub 小程序中新增咖啡点单模块，支持商品浏览、购物车、多方式支付（现金/积分/余额）和充值套餐余额管理。

**Architecture:** 新建独立 `coffee` 云函数处理业务逻辑，新增咖啡点单相关页面（coffee、coffee-cart、coffee-orders、coffee-order-detail），复用现有微信支付和积分扣除逻辑，咖啡订单与周边订单分开管理。

**Tech Stack:** 微信小程序（wxml/wxss/js）、微信云开发、云函数

---

## 文件结构

### 新增文件

```
cloudfunctions/coffee/
├── index.js              # 云函数入口
└── package.json          # 依赖配置

miniprogram/pages/coffee/
├── coffee.wxml           # 咖啡点单页
├── coffee.wxss           # 样式
├── coffee.js             # 逻辑
└── coffee.json           # 配置

miniprogram/pages/coffee-cart/
├── coffee-cart.wxml      # 购物车页
├── coffee-cart.wxss
├── coffee-cart.js
└── coffee-cart.json

miniprogram/pages/coffee-orders/
├── coffee-orders.wxml    # 咖啡订单列表
├── coffee-orders.wxss
├── coffee-orders.js
└── coffee-orders.json

miniprogram/pages/coffee-order-detail/
├── coffee-order-detail.wxml  # 订单详情
├── coffee-order-detail.wxss
├── coffee-order-detail.js
└── coffee-order-detail.json

miniprogram/pages/admin-coffee/
├── admin-coffee.wxml     # 咖啡商品管理
├── admin-coffee.wxss
├── admin-coffee.js
└── admin-coffee.json

miniprogram/pages/admin-coffee-edit/
├── admin-coffee-edit.wxml    # 商品编辑
├── admin-coffee-edit.wxss
├── admin-coffee-edit.js
└── admin-coffee-edit.json

miniprogram/pages/admin-coffee-orders/
├── admin-coffee-orders.wxml  # 咖啡订单管理
├── admin-coffee-orders.wxss
├── admin-coffee-orders.js
└── admin-coffee-orders.json

miniprogram/images/
├── coffee-active.png     # tabBar 图标
└── coffee.png
```

### 修改文件

```
miniprogram/app.json                          # 添加页面、tabBar
miniprogram/utils/request.js                  # 添加 coffeeApi
miniprogram/pages/profile/profile.wxml        # 添加咖啡余额入口
miniprogram/pages/profile/profile.js          # 添加咖啡余额逻辑
```

---

## Task 1: 创建 coffee 云函数

**Files:**
- Create: `cloudfunctions/coffee/index.js`
- Create: `cloudfunctions/coffee/package.json`

- [ ] **Step 1: 创建云函数目录和 package.json**

```bash
mkdir -p /Users/xu/Documents/SRC_wechat/cloudfunctions/coffee
```

创建 `cloudfunctions/coffee/package.json`:

```json
{
  "name": "coffee",
  "version": "1.0.0",
  "description": "咖啡点单云函数",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
```

- [ ] **Step 2: 创建云函数入口文件**

创建 `cloudfunctions/coffee/index.js`，包含基础结构和 getProducts action：

```javascript
// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { action, testOpenid, ...data } = event;
  const openid = testOpenid || wxContext.OPENID;

  switch (action) {
    case 'getProducts':
      return handleGetProducts(data, openid);
    case 'getProductDetail':
      return handleGetProductDetail(data, openid);
    case 'getBalance':
      return handleGetBalance(data, openid);
    case 'createOrder':
      return handleCreateOrder(data, openid);
    case 'payOrderByPoints':
      return handlePayOrderByPoints(data, openid);
    case 'payOrderByCash':
      return handlePayOrderByCash(data, openid);
    case 'payOrderByBalance':
      return handlePayOrderByBalance(data, openid);
    case 'getOrders':
      return handleGetOrders(data, openid);
    case 'getOrderDetail':
      return handleGetOrderDetail(data, openid);
    case 'cancelOrder':
      return handleCancelOrder(data, openid);
    default:
      return { code: -1, message: '未知操作' };
  }
};

// 获取商品列表
async function handleGetProducts(data, openid) {
  const { category } = data;

  try {
    let query = db.collection('coffee_products').where({ is_available: true });

    if (category) {
      query = query.where({ category });
    }

    const result = await query.orderBy('sort_order', 'asc').get();

    return {
      code: 0,
      data: { list: result.data }
    };
  } catch (error) {
    console.error('获取咖啡商品失败', error);
    return { code: -1, message: '获取失败' };
  }
}

// 获取商品详情
async function handleGetProductDetail(data, openid) {
  const { id } = data;

  try {
    const result = await db.collection('coffee_products').doc(id).get();
    return {
      code: 0,
      data: { product: result.data }
    };
  } catch (error) {
    console.error('获取商品详情失败', error);
    return { code: -1, message: '获取失败' };
  }
}

// 获取用户咖啡余额
async function handleGetBalance(data, openid) {
  try {
    const userResult = await db.collection('users').where({ openid }).get();
    if (userResult.data.length === 0) {
      return { code: -1, message: '用户不存在' };
    }
    const userId = userResult.data[0]._id;

    const balanceResult = await db.collection('coffee_balances').where({ user_id: userId }).get();

    if (balanceResult.data.length === 0) {
      return {
        code: 0,
        data: { americano: 0, any: 0 }
      };
    }

    const balance = balanceResult.data[0];
    return {
      code: 0,
      data: {
        americano: balance.americano_balance || 0,
        any: balance.any_balance || 0
      }
    };
  } catch (error) {
    console.error('获取咖啡余额失败', error);
    return { code: -1, message: '获取失败' };
  }
}

// 生成订单号
function generateOrderNo() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `CF${year}${month}${day}${random}`;
}

// 其他 handler 函数将在后续步骤中添加
```

- [ ] **Step 3: 部署云函数**

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli cloud functions deploy \
  --env "cloud1-2gyhe7s5efa4155f" \
  --names "coffee" \
  --project "/Users/xu/Documents/SRC_wechat"
```

- [ ] **Step 4: 提交代码**

```bash
git add cloudfunctions/coffee/
git commit -m "feat: 添加 coffee 云函数基础结构"
```

---

## Task 2: 添加 coffeeApi 到 request.js

**Files:**
- Modify: `miniprogram/utils/request.js`

- [ ] **Step 1: 添加 coffeeApi 接口**

在 `miniprogram/utils/request.js` 中添加 coffeeApi：

```javascript
// 咖啡相关接口
const coffeeApi = {
  getProducts: (data) => callFunction('coffee', 'getProducts', data, { showLoad: false }),
  getProductDetail: (data) => callFunction('coffee', 'getProductDetail', data),
  getBalance: (data) => callFunction('coffee', 'getBalance', data, { showLoad: false }),
  createOrder: (data) => callFunction('coffee', 'createOrder', data),
  payOrderByPoints: (data) => callFunction('coffee', 'payOrderByPoints', data),
  payOrderByCash: (data) => callFunction('coffee', 'payOrderByCash', data),
  payOrderByBalance: (data) => callFunction('coffee', 'payOrderByBalance', data),
  getOrders: (data) => callFunction('coffee', 'getOrders', data, { showLoad: false }),
  getOrderDetail: (data) => callFunction('coffee', 'getOrderDetail', data),
  cancelOrder: (data) => callFunction('coffee', 'cancelOrder', data)
};
```

并在 module.exports 中添加 `coffeeApi`。

- [ ] **Step 2: 提交代码**

```bash
git add miniprogram/utils/request.js
git commit -m "feat: 添加 coffeeApi 接口"
```

---

## Task 3: 更新 app.json 配置

**Files:**
- Modify: `miniprogram/app.json`

- [ ] **Step 1: 添加新页面到 pages 数组**

在 `miniprogram/app.json` 的 pages 数组中添加：

```json
"pages/coffee/coffee",
"pages/coffee-cart/coffee-cart",
"pages/coffee-orders/coffee-orders",
"pages/coffee-order-detail/coffee-order-detail",
"pages/admin-coffee/admin-coffee",
"pages/admin-coffee-edit/admin-coffee-edit",
"pages/admin-coffee-orders/admin-coffee-orders"
```

- [ ] **Step 2: 更新 tabBar 配置**

将 tabBar.list 改为 4 项：

```json
"tabBar": {
  "color": "#999999",
  "selectedColor": "#1A1A1A",
  "backgroundColor": "#ffffff",
  "borderStyle": "black",
  "list": [
    {
      "pagePath": "pages/activities/activities",
      "text": "活动"
    },
    {
      "pagePath": "pages/shop/shop",
      "text": "周边"
    },
    {
      "pagePath": "pages/coffee/coffee",
      "text": "咖啡",
      "iconPath": "images/coffee.png",
      "selectedIconPath": "images/coffee-active.png"
    },
    {
      "pagePath": "pages/profile/profile",
      "text": "我的"
    }
  ]
}
```

- [ ] **Step 3: 提交代码**

```bash
git add miniprogram/app.json
git commit -m "feat: 添加咖啡页面和 tabBar 配置"
```

---

## Task 4: 创建咖啡点单页面

**Files:**
- Create: `miniprogram/pages/coffee/coffee.wxml`
- Create: `miniprogram/pages/coffee/coffee.wxss`
- Create: `miniprogram/pages/coffee/coffee.js`
- Create: `miniprogram/pages/coffee/coffee.json`

- [ ] **Step 1: 创建页面配置 coffee.json**

```json
{
  "navigationBarTitleText": "咖啡点单",
  "enablePullDownRefresh": false
}
```

- [ ] **Step 2: 创建页面逻辑 coffee.js**

```javascript
// pages/coffee/coffee.js
const { coffeeApi } = require('../../utils/request');
const app = getApp();

Page({
  data: {
    storeName: 'And then',
    storeAddress: '上海爱琴海·缤纷里店',
    categories: [
      { key: 'americano', name: '美式' },
      { key: 'latte', name: '拿铁' },
      { key: 'special', name: '特调' },
      { key: 'decaf', name: '无咖啡因' },
      { key: 'pour_over', name: '单品手冲' },
      { key: 'recharge', name: '充值套餐' }
    ],
    currentCategory: 'americano',
    products: [],
    cart: [],          // 购物车
    cartCount: 0,      // 购物车数量
    cartTotal: 0,      // 购物车总额
    showTempModal: false,
    selectedProduct: null,
    loading: true
  },

  onLoad: function () {
    this.loadProducts();
    this.loadCartFromStorage();
  },

  onShow: function () {
    this.loadCartFromStorage();
    this.updateCartSummary();
  },

  // 加载商品
  loadProducts: async function () {
    try {
      const result = await coffeeApi.getProducts({ category: this.data.currentCategory });
      this.setData({
        products: result.list || [],
        loading: false
      });
    } catch (error) {
      console.error('加载商品失败', error);
      this.setData({ loading: false });
    }
  },

  // 切换分类
  switchCategory: function (e) {
    const category = e.currentTarget.dataset.category;
    this.setData({ currentCategory: category, loading: true });
    this.loadProducts();
  },

  // 从本地存储加载购物车
  loadCartFromStorage: function () {
    const cart = wx.getStorageSync('coffee_cart') || [];
    this.setData({ cart });
    this.updateCartSummary();
  },

  // 更新购物车统计
  updateCartSummary: function () {
    const cart = this.data.cart;
    let count = 0;
    let total = 0;
    cart.forEach(item => {
      count += item.quantity;
      total += item.price * item.quantity;
    });
    this.setData({ cartCount: count, cartTotal: total });
  },

  // 点击加号
  onAddToCart: function (e) {
    const product = e.currentTarget.dataset.product;

    // 根据温度配置决定是否弹窗
    if (product.temperature === 'both') {
      this.setData({ showTempModal: true, selectedProduct: product });
    } else {
      // 仅冷或仅热，直接加入购物车
      const temp = product.temperature === 'cold_only' ? 'cold' : 'hot';
      this.addToCart(product, temp);
    }
  },

  // 选择温度
  selectTemp: function (e) {
    const temp = e.currentTarget.dataset.temp;
    this.addToCart(this.data.selectedProduct, temp);
    this.setData({ showTempModal: false, selectedProduct: null });
  },

  // 关闭温度弹窗
  closeTempModal: function () {
    this.setData({ showTempModal: false, selectedProduct: null });
  },

  // 加入购物车
  addToCart: function (product, temperature) {
    const cart = [...this.data.cart];
    const existIndex = cart.findIndex(
      item => item.product_id === product._id && item.temperature === temperature
    );

    if (existIndex > -1) {
      cart[existIndex].quantity += 1;
    } else {
      cart.push({
        product_id: product._id,
        product_name: product.name,
        price: product.price,
        temperature,
        temperatureText: temperature === 'cold' ? '冷' : '热',
        quantity: 1,
        category: product.category
      });
    }

    this.setData({ cart });
    this.updateCartSummary();
    wx.setStorageSync('coffee_cart', cart);
    wx.showToast({ title: '已加入购物车', icon: 'success' });
  },

  // 去购物车
  goToCart: function () {
    wx.navigateTo({ url: '/pages/coffee-cart/coffee-cart' });
  },

  // 去咖啡订单
  goToOrders: function () {
    wx.navigateTo({ url: '/pages/coffee-orders/coffee-orders' });
  }
});
```

- [ ] **Step 3: 创建页面模板 coffee.wxml**

```xml
<!--pages/coffee/coffee.wxml-->
<view class="container">
  <!-- 门店信息 -->
  <view class="store-info">
    <text class="store-name">{{storeName}}</text>
    <text class="store-address">{{storeAddress}}</text>
  </view>

  <!-- 分类 Tab -->
  <scroll-view class="category-tabs" scroll-x>
    <view
      class="tab-item {{currentCategory === item.key ? 'active' : ''}}"
      wx:for="{{categories}}"
      wx:key="key"
      bindtap="switchCategory"
      data-category="{{item.key}}"
    >
      {{item.name}}
    </view>
  </scroll-view>

  <!-- 商品列表 -->
  <view class="product-list">
    <view wx:if="{{loading}}" class="loading-box">
      <text>加载中...</text>
    </view>

    <view wx:elif="{{products.length === 0}}" class="empty-box">
      <text>暂无商品</text>
    </view>

    <view class="product-item" wx:for="{{products}}" wx:key="_id">
      <view class="product-info">
        <text class="product-name">{{item.name}}</text>
        <text class="product-temp" wx:if="{{item.temperature === 'both'}}">(冷/热)</text>
        <text class="product-temp" wx:elif="{{item.temperature === 'cold_only'}}">(冷)</text>
        <text class="product-temp" wx:elif="{{item.temperature === 'hot_only'}}">(热)</text>
      </view>
      <view class="product-right">
        <text class="product-price">￥{{item.price / 100}}</text>
        <view class="add-btn" bindtap="onAddToCart" data-product="{{item}}">
          <text>+</text>
        </view>
      </view>
    </view>
  </view>

  <!-- 底部购物车栏 -->
  <view class="cart-bar" bindtap="goToCart">
    <view class="cart-icon-wrapper">
      <text class="cart-icon">🛒</text>
      <view class="cart-badge" wx:if="{{cartCount > 0}}">{{cartCount}}</view>
    </view>
    <view class="cart-total">
      <text class="total-label">合计</text>
      <text class="total-price">￥{{cartTotal / 100}}</text>
    </view>
    <view class="cart-btn">去结算</view>
  </view>

  <!-- 温度选择弹窗 -->
  <view class="temp-modal" wx:if="{{showTempModal}}">
    <view class="modal-mask" bindtap="closeTempModal"></view>
    <view class="modal-content">
      <text class="modal-title">选择温度</text>
      <view class="temp-btns">
        <view class="temp-btn" bindtap="selectTemp" data-temp="cold">冷</view>
        <view class="temp-btn" bindtap="selectTemp" data-temp="hot">热</view>
      </view>
    </view>
  </view>
</view>
```

- [ ] **Step 4: 创建页面样式 coffee.wxss**

```css
/* pages/coffee/coffee.wxss */
page {
  background: #F8F8F8;
}

.container {
  min-height: 100vh;
  padding-bottom: 120rpx;
}

/* 门店信息 */
.store-info {
  background: #1A1A1A;
  padding: 24rpx 30rpx;
  color: #FFFFFF;
}

.store-name {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  margin-bottom: 8rpx;
}

.store-address {
  font-size: 24rpx;
  opacity: 0.7;
}

/* 分类 Tab */
.category-tabs {
  white-space: nowrap;
  background: #FFFFFF;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #F0F0F0;
}

.tab-item {
  display: inline-block;
  padding: 16rpx 32rpx;
  font-size: 28rpx;
  color: #666666;
}

.tab-item.active {
  color: #1A1A1A;
  font-weight: 600;
  border-bottom: 4rpx solid #1A1A1A;
}

/* 商品列表 */
.product-list {
  padding: 20rpx;
}

.product-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #FFFFFF;
  padding: 28rpx 24rpx;
  margin-bottom: 16rpx;
  border-radius: 12rpx;
}

.product-info {
  flex: 1;
}

.product-name {
  font-size: 30rpx;
  color: #1A1A1A;
  font-weight: 500;
}

.product-temp {
  font-size: 24rpx;
  color: #999999;
  margin-left: 8rpx;
}

.product-right {
  display: flex;
  align-items: center;
}

.product-price {
  font-size: 32rpx;
  font-weight: 600;
  color: #1A1A1A;
  margin-right: 24rpx;
}

.add-btn {
  width: 56rpx;
  height: 56rpx;
  background: #2E7D32;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-btn text {
  color: #FFFFFF;
  font-size: 36rpx;
  line-height: 1;
}

/* 底部购物车栏 */
.cart-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100rpx;
  background: #FFFFFF;
  display: flex;
  align-items: center;
  padding: 0 24rpx;
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.cart-icon-wrapper {
  position: relative;
  margin-right: 24rpx;
}

.cart-icon {
  font-size: 48rpx;
}

.cart-badge {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  background: #F44336;
  color: #FFFFFF;
  font-size: 20rpx;
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cart-total {
  flex: 1;
}

.total-label {
  font-size: 24rpx;
  color: #999999;
  margin-right: 8rpx;
}

.total-price {
  font-size: 36rpx;
  font-weight: 600;
  color: #1A1A1A;
}

.cart-btn {
  background: #1A1A1A;
  color: #FFFFFF;
  font-size: 28rpx;
  padding: 16rpx 48rpx;
  border-radius: 32rpx;
}

/* 温度选择弹窗 */
.temp-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
}

.modal-content {
  position: relative;
  background: #FFFFFF;
  padding: 48rpx;
  border-radius: 16rpx;
  width: 80%;
}

.modal-title {
  display: block;
  text-align: center;
  font-size: 32rpx;
  font-weight: 600;
  margin-bottom: 40rpx;
}

.temp-btns {
  display: flex;
  gap: 24rpx;
}

.temp-btn {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  background: #F5F5F5;
  border-radius: 8rpx;
  font-size: 30rpx;
  color: #1A1A1A;
}

.temp-btn:active {
  background: #E0E0E0;
}

/* 加载和空状态 */
.loading-box, .empty-box {
  text-align: center;
  padding: 60rpx;
  color: #999999;
}
```

- [ ] **Step 5: 提交代码**

```bash
git add miniprogram/pages/coffee/
git commit -m "feat: 创建咖啡点单页面"
```

---

## Task 5: 创建购物车页面

**Files:**
- Create: `miniprogram/pages/coffee-cart/coffee-cart.wxml`
- Create: `miniprogram/pages/coffee-cart/coffee-cart.wxss`
- Create: `miniprogram/pages/coffee-cart/coffee-cart.js`
- Create: `miniprogram/pages/coffee-cart/coffee-cart.json`

- [ ] **Step 1: 创建页面配置 coffee-cart.json**

```json
{
  "navigationBarTitleText": "购物车",
  "enablePullDownRefresh": false
}
```

- [ ] **Step 2: 创建页面逻辑 coffee-cart.js**

```javascript
// pages/coffee-cart/coffee-cart.js
const { coffeeApi } = require('../../utils/request');

Page({
  data: {
    cart: [],
    balance: { americano: 0, any: 0 },
    paymentType: 'cash',  // cash/points/balance
    loading: false
  },

  onLoad: function () {
    this.loadCart();
    this.loadBalance();
  },

  // 加载购物车
  loadCart: function () {
    const cart = wx.getStorageSync('coffee_cart') || [];
    this.setData({ cart });
  },

  // 加载余额
  loadBalance: async function () {
    try {
      const result = await coffeeApi.getBalance({});
      this.setData({ balance: result });
    } catch (error) {
      console.error('加载余额失败', error);
    }
  },

  // 增加数量
  increaseQty: function (e) {
    const index = e.currentTarget.dataset.index;
    const cart = [...this.data.cart];
    cart[index].quantity += 1;
    this.setData({ cart });
    wx.setStorageSync('coffee_cart', cart);
  },

  // 减少数量
  decreaseQty: function (e) {
    const index = e.currentTarget.dataset.index;
    const cart = [...this.data.cart];
    if (cart[index].quantity > 1) {
      cart[index].quantity -= 1;
    } else {
      cart.splice(index, 1);
    }
    this.setData({ cart });
    wx.setStorageSync('coffee_cart', cart);
  },

  // 删除商品
  removeItem: function (e) {
    const index = e.currentTarget.dataset.index;
    const cart = [...this.data.cart];
    cart.splice(index, 1);
    this.setData({ cart });
    wx.setStorageSync('coffee_cart', cart);
  },

  // 计算总价
  getTotalPrice: function () {
    return this.data.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  },

  // 选择支付方式
  selectPayment: function (e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ paymentType: type });
  },

  // 结算
  checkout: async function () {
    const { cart, paymentType, balance } = this.data;

    if (cart.length === 0) {
      wx.showToast({ title: '购物车为空', icon: 'none' });
      return;
    }

    this.setData({ loading: true });

    try {
      // 创建订单
      const orderItems = cart.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        temperature: item.temperature,
        price: item.price,
        quantity: item.quantity,
        category: item.category
      }));

      const orderResult = await coffeeApi.createOrder({ items: orderItems });
      const orderId = orderResult.orderId;

      // 根据支付方式支付
      if (paymentType === 'points') {
        await coffeeApi.payOrderByPoints({ orderId });
      } else if (paymentType === 'balance') {
        await coffeeApi.payOrderByBalance({ orderId });
      } else {
        await coffeeApi.payOrderByCash({ orderId });
      }

      // 清空购物车
      wx.removeStorageSync('coffee_cart');

      wx.showToast({ title: '支付成功', icon: 'success' });

      setTimeout(() => {
        wx.redirectTo({ url: `/pages/coffee-order-detail/coffee-order-detail?id=${orderId}` });
      }, 1500);
    } catch (error) {
      console.error('结算失败', error);
      wx.showToast({ title: error.message || '支付失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  }
});
```

- [ ] **Step 3: 创建页面模板 coffee-cart.wxml**

```xml
<!--pages/coffee-cart/coffee-cart.wxml-->
<view class="container">
  <!-- 购物车列表 -->
  <view class="cart-list" wx:if="{{cart.length > 0}}">
    <view class="cart-item" wx:for="{{cart}}" wx:key="product_id">
      <view class="item-info">
        <text class="item-name">{{item.product_name}}</text>
        <text class="item-temp">{{item.temperatureText}}</text>
      </view>
      <view class="item-actions">
        <view class="qty-btn" bindtap="decreaseQty" data-index="{{index}}">-</view>
        <text class="qty-num">{{item.quantity}}</text>
        <view class="qty-btn" bindtap="increaseQty" data-index="{{index}}">+</view>
      </view>
      <text class="item-price">￥{{item.price * item.quantity / 100}}</text>
      <text class="item-delete" bindtap="removeItem" data-index="{{index}}">×</text>
    </view>
  </view>

  <view wx:else class="empty-box">
    <text>购物车为空</text>
  </view>

  <!-- 支付方式 -->
  <view class="payment-section" wx:if="{{cart.length > 0}}">
    <text class="section-title">支付方式</text>
    <view class="payment-options">
      <view class="payment-item {{paymentType === 'cash' ? 'active' : ''}}" bindtap="selectPayment" data-type="cash">
        <text>微信支付</text>
      </view>
      <view class="payment-item {{paymentType === 'points' ? 'active' : ''}}" bindtap="selectPayment" data-type="points">
        <text>积分支付</text>
      </view>
      <view class="payment-item {{paymentType === 'balance' ? 'active' : ''}}" bindtap="selectPayment" data-type="balance">
        <text>余额支付</text>
        <text class="balance-info">(美式:{{balance.americano}} 任意:{{balance.any}})</text>
      </view>
    </view>
  </view>

  <!-- 底部结算栏 -->
  <view class="checkout-bar" wx:if="{{cart.length > 0}}">
    <view class="total-info">
      <text class="total-label">合计</text>
      <text class="total-price">￥{{cart.reduce((sum, item) => sum + item.price * item.quantity, 0) / 100}}</text>
    </view>
    <button class="checkout-btn" bindtap="checkout" loading="{{loading}}">结算</button>
  </view>
</view>
```

- [ ] **Step 4: 创建页面样式 coffee-cart.wxss**

```css
/* pages/coffee-cart/coffee-cart.wxss */
page {
  background: #F8F8F8;
}

.container {
  min-height: 100vh;
  padding-bottom: 140rpx;
}

/* 购物车列表 */
.cart-list {
  padding: 20rpx;
}

.cart-item {
  display: flex;
  align-items: center;
  background: #FFFFFF;
  padding: 24rpx;
  margin-bottom: 16rpx;
  border-radius: 12rpx;
}

.item-info {
  flex: 1;
}

.item-name {
  font-size: 28rpx;
  color: #1A1A1A;
  display: block;
}

.item-temp {
  font-size: 24rpx;
  color: #999999;
}

.item-actions {
  display: flex;
  align-items: center;
  margin: 0 24rpx;
}

.qty-btn {
  width: 48rpx;
  height: 48rpx;
  background: #F5F5F5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: #1A1A1A;
}

.qty-num {
  width: 60rpx;
  text-align: center;
  font-size: 28rpx;
}

.item-price {
  font-size: 28rpx;
  font-weight: 600;
  color: #1A1A1A;
  margin-right: 16rpx;
}

.item-delete {
  font-size: 32rpx;
  color: #999999;
  padding: 8rpx;
}

/* 支付方式 */
.payment-section {
  margin: 20rpx;
  background: #FFFFFF;
  border-radius: 12rpx;
  padding: 24rpx;
}

.section-title {
  font-size: 28rpx;
  color: #666666;
  margin-bottom: 20rpx;
  display: block;
}

.payment-options {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.payment-item {
  padding: 20rpx;
  background: #F8F8F8;
  border-radius: 8rpx;
  font-size: 28rpx;
  color: #1A1A1A;
}

.payment-item.active {
  background: #1A1A1A;
  color: #FFFFFF;
}

.balance-info {
  font-size: 24rpx;
  opacity: 0.8;
  margin-left: 8rpx;
}

/* 底部结算栏 */
.checkout-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 120rpx;
  background: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.total-info {
  display: flex;
  align-items: baseline;
}

.total-label {
  font-size: 24rpx;
  color: #999999;
  margin-right: 8rpx;
}

.total-price {
  font-size: 40rpx;
  font-weight: 600;
  color: #1A1A1A;
}

.checkout-btn {
  background: #1A1A1A;
  color: #FFFFFF;
  font-size: 30rpx;
  padding: 20rpx 60rpx;
  border-radius: 40rpx;
}

/* 空状态 */
.empty-box {
  text-align: center;
  padding: 100rpx;
  color: #999999;
}
```

- [ ] **Step 5: 提交代码**

```bash
git add miniprogram/pages/coffee-cart/
git commit -m "feat: 创建购物车页面"
```

---

## Task 6: 完善云函数订单逻辑

**Files:**
- Modify: `cloudfunctions/coffee/index.js`

- [ ] **Step 1: 添加 createOrder、payOrderByPoints、getOrders 等函数**

在 `cloudfunctions/coffee/index.js` 中添加完整的订单处理函数。参考现有 `shop` 云函数的模式，实现：
- `handleCreateOrder` - 创建订单
- `handlePayOrderByPoints` - 积分支付
- `handlePayOrderByCash` - 现金支付
- `handlePayOrderByBalance` - 余额支付
- `handleGetOrders` - 获取订单列表
- `handleGetOrderDetail` - 获取订单详情
- `handleCancelOrder` - 取消订单

关键逻辑：
1. 创建订单时计算总金额、总杯数
2. 积分支付时调用 points 云函数扣除积分
3. 余额支付时检查并扣减 coffee_balances 表
4. 充值套餐支付成功后增加用户余额

- [ ] **Step 2: 部署云函数**

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli cloud functions deploy \
  --env "cloud1-2gyhe7s5efa4155f" \
  --names "coffee" \
  --project "/Users/xu/Documents/SRC_wechat"
```

- [ ] **Step 3: 提交代码**

```bash
git add cloudfunctions/coffee/index.js
git commit -m "feat: 完善 coffee 云函数订单逻辑"
```

---

## Task 7: 创建咖啡订单列表页

**Files:**
- Create: `miniprogram/pages/coffee-orders/coffee-orders.*`

- [ ] **Step 1: 创建页面文件**

参考现有 `pages/orders/orders.*` 的模式，创建咖啡订单列表页面，显示用户的历史咖啡订单。

- [ ] **Step 2: 提交代码**

```bash
git add miniprogram/pages/coffee-orders/
git commit -m "feat: 创建咖啡订单列表页"
```

---

## Task 8: 创建咖啡订单详情页

**Files:**
- Create: `miniprogram/pages/coffee-order-detail/coffee-order-detail.*`

- [ ] **Step 1: 创建页面文件**

显示单个咖啡订单的详情，包括：
- 订单号、状态
- 商品列表（名称、温度、数量、价格）
- 支付方式、支付金额
- 门店信息
- 下单时间

- [ ] **Step 2: 提交代码**

```bash
git add miniprogram/pages/coffee-order-detail/
git commit -m "feat: 创建咖啡订单详情页"
```

---

## Task 9: 创建管理后台咖啡商品管理页

**Files:**
- Create: `miniprogram/pages/admin-coffee/admin-coffee.*`
- Create: `miniprogram/pages/admin-coffee-edit/admin-coffee-edit.*`

- [ ] **Step 1: 创建商品管理列表页**

参考 `pages/admin-products/admin-products.*` 的模式，创建咖啡商品管理页面，支持：
- 查看所有咖啡商品
- 上下架操作
- 跳转编辑

- [ ] **Step 2: 创建商品编辑页**

支持新增/编辑咖啡商品，字段包括：
- 名称、分类、价格
- 积分价格（可选）
- 温度选项
- 是否上架
- 排序权重
- 充值套餐专用字段

- [ ] **Step 3: 提交代码**

```bash
git add miniprogram/pages/admin-coffee/ miniprogram/pages/admin-coffee-edit/
git commit -m "feat: 创建管理后台咖啡商品管理页"
```

---

## Task 10: 创建管理后台咖啡订单管理页

**Files:**
- Create: `miniprogram/pages/admin-coffee-orders/admin-coffee-orders.*`

- [ ] **Step 1: 创建订单管理页面**

显示所有咖啡订单，支持：
- 按状态筛选
- 查看订单详情
- 标记订单为已完成

- [ ] **Step 2: 提交代码**

```bash
git add miniprogram/pages/admin-coffee-orders/
git commit -m "feat: 创建管理后台咖啡订单管理页"
```

---

## Task 11: 更新个人中心页面

**Files:**
- Modify: `miniprogram/pages/profile/profile.wxml`
- Modify: `miniprogram/pages/profile/profile.js`

- [ ] **Step 1: 添加咖啡余额入口**

在个人中心添加：
- 「咖啡余额」入口，显示美式余额和任意余额
- 「咖啡订单」入口，跳转到咖啡订单列表

- [ ] **Step 2: 提交代码**

```bash
git add miniprogram/pages/profile/
git commit -m "feat: 个人中心添加咖啡余额入口"
```

---

## Task 12: 创建初始商品数据

**Files:**
- Cloud database: `coffee_products` collection

- [ ] **Step 1: 在云开发控制台创建数据表并导入初始商品**

按照设计文档中的商品列表，创建以下商品数据：

**美式分类：**
- 美式（冷/热）￥16
- 葡萄气泡美式（冷）￥18
- 菠萝气泡美式（冷）￥18

**拿铁分类：**
- 拿铁（冷/热）￥26
- 生椰拿铁（冷/热）￥28
- 香草拿铁（冷/热）￥28
- 西班牙拿铁（冷/热）￥28
- 焦糖拿铁（冷/热）￥28
- 话梅拿铁（冷/热）￥28

**特调分类：**
- 橘皮拿铁￥30
- 开心果拿铁￥30
- 黑芝麻拿铁￥30
- 路易波士鸳鸯拿铁￥30
- 曼谷咖啡拿铁￥30

**无咖啡因分类：**
- 抹茶拿铁￥26
- 路易波士茶拿铁￥26
- 姜黄拿铁￥26

**单品手冲分类：**
- 单品手冲￥35

**充值套餐分类：**
- 美式套餐×10杯￥138
- 任意套餐×10杯￥218

---

## Task 13: 测试与上传

- [ ] **Step 1: 本地测试完整流程**

在开发者工具中测试：
1. 浏览咖啡商品
2. 加入购物车、选择温度
3. 购物车调整数量
4. 选择支付方式结算
5. 查看订单详情
6. 管理后台管理商品和订单

- [ ] **Step 2: 上传体验版**

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli upload \
  --project "/Users/xu/Documents/SRC_wechat" \
  --version "1.2.0" \
  --desc "新增咖啡点单功能"
```

- [ ] **Step 3: 提交最终代码**

```bash
git add -A
git commit -m "feat: 咖啡点单功能完整实现"
git push origin main
```