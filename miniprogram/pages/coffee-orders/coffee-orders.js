// pages/coffee-orders/coffee-orders.js
const { coffeeApi } = require('../../utils/request');

Page({
  data: {
    orders: [],
    loading: true,
    loadingMore: false,
    hasMore: true,
    page: 1
  },

  onLoad: function () {
    this.loadOrders();
  },

  onPullDownRefresh: function () {
    this.setData({ page: 1, hasMore: true, orders: [] });
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