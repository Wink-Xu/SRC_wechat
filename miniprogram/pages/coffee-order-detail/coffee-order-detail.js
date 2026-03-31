// pages/coffee-order-detail/coffee-order-detail.js
const { coffeeApi } = require('../../utils/request');

Page({
  data: {
    order: null,
    loading: true
  },

  onLoad: function (options) {
    if (options.id) {
      this.loadOrder(options.id);
    }
  },

  loadOrder: async function (id) {
    try {
      const result = await coffeeApi.getOrderDetail({ id });
      this.setData({
        order: result.order,
        loading: false
      });
    } catch (error) {
      console.error('加载订单失败', error);
      this.setData({ loading: false });
    }
  },

  cancelOrder: async function () {
    const confirm = await wx.showModal({
      title: '取消订单',
      content: '确定要取消此订单吗？'
    });

    if (!confirm.confirm) return;

    try {
      await coffeeApi.cancelOrder({ orderId: this.data.order._id });
      wx.showToast({ title: '已取消', icon: 'success' });
      this.loadOrder(this.data.order._id);
    } catch (error) {
      wx.showToast({ title: error.message || '取消失败', icon: 'none' });
    }
  },

  getPaymentText: function (type) {
    const map = {
      cash: '微信支付',
      points: '积分支付',
      balance: '余额支付'
    };
    return map[type] || type;
  }
});