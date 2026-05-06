// pages/coffee-orders/coffee-orders.js
const { coffeeApi } = require('../../utils/request');

Page({
  data: {
    orders: [],
    balance: { americano: 0, any: 0 },
    loading: true,
    loadingMore: false,
    hasMore: true,
    page: 1,
    hasSubscribed: false,
    hasLoaded: false
  },

  onLoad: function () {
    this.checkSubscription();
    this.loadBalance();
    this.loadOrders();
    this.setData({ hasLoaded: true });
  },

  onShow: function () {
    // 每次显示页面时刷新订阅状态
    this.checkSubscription();
    // 只在首次或缓存过期时刷新余额
    if (this.data.hasLoaded) {
      const lastBalanceLoadTime = wx.getStorageSync('coffee_balance_last_load_time') || 0;
      if (Date.now() - lastBalanceLoadTime > 2 * 60 * 1000) {
        this.loadBalance();
      }
      return;
    }
    this.loadBalance();
    this.loadOrders();
    this.setData({ hasLoaded: true });
  },

  // 检查是否已订阅
  checkSubscription: function () {
    const hasSubscribed = wx.getStorageSync('coffee_order_subscribed') || false;
    this.setData({ hasSubscribed });
  },

  // 请求订阅消息
  requestSubscribe: function () {
    const that = this;
    const TEMPLATE_ID = 'PPJGcyK4yaRO6FcJFJsrwXoico9heyOdsyBVwjt35-U';

    wx.requestSubscribeMessage({
      tmplIds: [TEMPLATE_ID],
      success: function (res) {
        if (res[TEMPLATE_ID] === 'accept') {
          wx.setStorageSync('coffee_order_subscribed', true);
          that.setData({ hasSubscribed: true });
          wx.showToast({ title: '已开启通知', icon: 'success' });
        } else if (res[TEMPLATE_ID] === 'reject') {
          wx.showToast({ title: '您已拒绝订阅', icon: 'none' });
        }
      },
      fail: function (err) {
        console.error('订阅失败:', err);
      }
    });
  },

  // 加载咖啡余额
  loadBalance: async function () {
    try {
      const result = await coffeeApi.getBalance({});
      this.setData({ balance: result });
      wx.setStorageSync('coffee_balance_last_load_time', Date.now());
    } catch (error) {
      console.error('加载余额失败', error);
    }
  },

  onPullDownRefresh: function () {
    this.setData({ page: 1, hasMore: true, orders: [] });
    this.loadBalance();
    this.loadOrders().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom: function () {
    if (this.data.hasMore && !this.data.loadingMore) {
      this.loadMore();
    }
  },

  loadOrders: async function () {
    try {
      const result = await coffeeApi.getOrders({ page: this.data.page, limit: 10 });
      const orders = result.list || [];

      this.setData({
        orders: this.data.page === 1 ? orders : [...this.data.orders, ...orders],
        hasMore: orders.length >= 10,
        loading: false
      });
    } catch (error) {
      console.error('加载订单失败', error);
      this.setData({ loading: false });
    }
  },

  loadMore: function () {
    this.setData({ loadingMore: true, page: this.data.page + 1 });
    this.loadOrders().then(() => {
      this.setData({ loadingMore: false });
    });
  },

  goToDetail: function (e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/coffee-order-detail/coffee-order-detail?id=${id}` });
  },

  getStatusText: function (status) {
    const map = {
      pending: '待支付',
      paid: '已支付',
      completed: '已完成',
      cancelled: '已取消'
    };
    return map[status] || status;
  },

  getStatusClass: function (status) {
    const map = {
      pending: 'status-pending',
      paid: 'status-paid',
      completed: 'status-completed',
      cancelled: 'status-cancelled'
    };
    return map[status] || '';
  }
});