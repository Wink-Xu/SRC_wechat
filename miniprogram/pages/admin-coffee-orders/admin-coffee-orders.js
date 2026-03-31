// pages/admin-coffee-orders/admin-coffee-orders.js
const { coffeeApi } = require('../../utils/request');

Page({
  data: {
    orders: [],
    loading: true,
    statusFilter: 'all'
  },

  onLoad: function () {
    this.loadOrders();
  },

  loadOrders: async function () {
    try {
      const result = await coffeeApi.adminGetOrders({ status: this.data.statusFilter });
      this.setData({
        orders: result.list || [],
        loading: false
      });
    } catch (error) {
      console.error('加载订单失败', error);
      this.setData({ loading: false });
    }
  },

  onFilterChange: function (e) {
    this.setData({ statusFilter: e.currentTarget.dataset.status, loading: true });
    this.loadOrders();
  },

  updateStatus: async function (e) {
    const { id, status } = e.currentTarget.dataset;
    try {
      await coffeeApi.adminUpdateOrderStatus({ orderId: id, status });
      wx.showToast({ title: '更新成功', icon: 'success' });
      this.loadOrders();
    } catch (error) {
      wx.showToast({ title: error.message || '操作失败', icon: 'none' });
    }
  }
});