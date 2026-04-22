// pages/coffee-cart/coffee-cart.js
const { coffeeApi } = require('../../utils/request');

Page({
  data: {
    cart: [],
    cartTotal: 0,
    balance: { americano: 0, any: 0 },
    paymentType: 'cash',
    loading: false,
    canUsePoints: true,  // 是否可以使用积分支付（所有商品都支持）
    isLoggedIn: false    // 是否已登录
  },

  onLoad: function () {
    this.checkLoginStatus();
    this.loadCart();
    this.loadBalance();
  },

  // 检查登录状态
  checkLoginStatus: function () {
    const userInfo = wx.getStorageSync('userInfo') || {};
    const isOpenid = wx.getStorageSync('openid');
    this.setData({
      isLoggedIn: !!(userInfo.openid || isOpenid)
    });
  },

  // 加载购物车
  loadCart: function () {
    const cart = wx.getStorageSync('coffee_cart') || [];

    // 检查是否所有商品都支持积分支付
    const allSupportPoints = cart.every(item => item.points_price && item.points_price > 0);

    this.setData({
      cart,
      canUsePoints: allSupportPoints
    });
    this.updateCartTotal();
  },

  // 更新总价
  updateCartTotal: function () {
    const total = this.data.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    this.setData({ cartTotal: total });
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
    this.updateCartTotal();
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
    this.updateCartTotal();
    wx.setStorageSync('coffee_cart', cart);
  },

  // 删除商品
  removeItem: function (e) {
    const index = e.currentTarget.dataset.index;
    const cart = [...this.data.cart];
    cart.splice(index, 1);
    this.setData({ cart });
    this.updateCartTotal();
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
    const { cart, paymentType } = this.data;

    if (cart.length === 0) {
      wx.showToast({ title: '购物车为空', icon: 'none' });
      return;
    }

    this.setData({ loading: true });

    try {
      // 创建订单（包含备注信息）
      const orderItems = cart.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        temperature: item.temperature,
        price: item.price,
        quantity: item.quantity,
        category: item.category,
        remark: item.remark || ''
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