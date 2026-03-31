// pages/coffee/coffee.js
const { coffeeApi } = require('../../utils/request');

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
    cart: [],
    cartCount: 0,
    cartTotal: 0,
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

    if (product.temperature === 'both') {
      this.setData({ showTempModal: true, selectedProduct: product });
    } else {
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
        temperature: temperature,
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
    if (this.data.cartCount === 0) {
      wx.showToast({ title: '购物车为空', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/coffee-cart/coffee-cart' });
  },

  // 去咖啡订单
  goToOrders: function () {
    wx.navigateTo({ url: '/pages/coffee-orders/coffee-orders' });
  }
});