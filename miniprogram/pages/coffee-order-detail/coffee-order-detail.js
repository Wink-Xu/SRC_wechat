// pages/coffee-order-detail/coffee-order-detail.js
const { coffeeApi } = require('../../utils/request');

Page({
  data: {
    order: null,
    loading: true,
    isAdmin: false,
    statusOptions: [
      { value: 'pending', text: '待处理' },
      { value: 'processing', text: '制作中' },
      { value: 'completed', text: '已完成' },
      { value: 'cancelled', text: '已取消' }
    ]
  },

  onLoad: function (options) {
    // 判断是否从管理后台进入
    const isAdmin = options.from === 'admin';
    this.setData({ isAdmin });
    if (options.id) {
      this.loadOrder(options.id, isAdmin);
    }
  },

  loadOrder: async function (id, isAdmin) {
    try {
      const result = await coffeeApi.getOrderDetail({ id, from: isAdmin ? 'admin' : '' });
      const order = result.order;
      // 添加状态文本
      order.statusText = this.getStatusText(order.status);
      this.setData({ order, loading: false });
    } catch (error) {
      console.error('加载订单失败', error);
      wx.showToast({ title: error.message || '加载失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  getStatusText: function (status) {
    const map = {
      'pending': '待处理',
      'paid': '已支付',
      'processing': '制作中',
      'completed': '已完成',
      'cancelled': '已取消'
    };
    return map[status] || status;
  },

  // 更新订单状态（管理员）
  updateOrderStatus: async function (e) {
    const { status } = e.currentTarget.dataset;
    const statusText = this.getStatusText(status);

    wx.showModal({
      title: '确认操作',
      content: `确定要将订单状态改为"${statusText}"吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            await coffeeApi.adminUpdateOrderStatus({ orderId: this.data.order._id, status });
            wx.showToast({ title: '更新成功', icon: 'success' });
            this.loadOrder(this.data.order._id);
          } catch (error) {
            wx.showToast({ title: error.message || '操作失败', icon: 'none' });
          }
        }
      }
    });
  },

  // 复制订单号
  copyOrderNo: function () {
    wx.setClipboardData({
      data: this.data.order.order_no,
      success: () => {
        wx.showToast({ title: '已复制', icon: 'success' });
      }
    });
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

  // 去支付（微信支付）
  payOrder: async function () {
    const orderId = this.data.order._id;
    try {
      const payResult = await coffeeApi.payOrderByCash({ orderId });
      wx.requestPayment({
        timeStamp: payResult.timeStamp,
        nonceStr: payResult.nonceStr,
        package: payResult.package,
        signType: payResult.signType,
        paySign: payResult.paySign,
        success: () => {
          wx.showToast({ title: '支付成功', icon: 'success' });
          this.loadOrder(orderId);
        },
        fail: (err) => {
          console.error('支付失败', err);
          wx.showToast({ title: '支付已取消', icon: 'none' });
        }
      });
    } catch (error) {
      wx.showToast({ title: error.message || '支付失败', icon: 'none' });
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