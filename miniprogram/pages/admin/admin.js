// pages/admin/admin.js
const { adminApi } = require('../../utils/request');
const { requireAdmin } = require('../../utils/auth');

Page({
  data: {
    statistics: {
      memberCount: 0,
      pendingCount: 0,
      activityCount: 0,
      orderCount: 0
    },
    loading: true,
    userRole: ''
  },

  onLoad: function () {
    if (!requireAdmin()) {
      setTimeout(() => wx.switchTab({ url: '/pages/activities/activities' }), 1500);
      return;
    }
    this.loadUserInfo();
    this.loadStatistics();
  },

  onShow: function () {
    this.loadStatistics();
    // 管理员订阅通知（新成员、新订单等）
    this.requestAdminSubscribe();
  },

  // 管理员订阅通知
  requestAdminSubscribe: function () {
    const hasSubscribed = wx.getStorageSync('admin_subscribed');
    if (hasSubscribed) return;
    // 延迟弹出，避免干扰首次加载
    setTimeout(() => {
      wx.showModal({
        title: '开启通知',
        content: '是否开启新成员申请和新订单提醒？开启后团长和管理员可及时收到通知',
        confirmText: '开启',
        cancelText: '暂不',
        success: (res) => {
          if (res.confirm) {
            wx.requestSubscribeMessage({
              tmplIds: ['PPJGcyK4yaRO6FcJFJsrwXoico9heyOdsyBVwjt35-U'],
              success: (res) => {
                if (res.errMsg === 'requestSubscribeMessage:ok') {
                  wx.setStorageSync('admin_subscribed', true);
                }
              },
              fail: (err) => { console.log('订阅授权失败:', err); }
            });
          }
        }
      });
    }, 2000);
  },

  // 加载用户信息
  loadUserInfo: function () {
    const user = wx.getStorageSync('userInfo');
    if (user && user.role) {
      this.setData({ userRole: user.role });
    }
  },

  // 加载统计数据
  loadStatistics: async function () {
    try {
      const result = await adminApi.getStatistics();
      this.setData({
        statistics: result,
        loading: false
      });
    } catch (error) {
      console.error('加载统计数据失败', error);
      this.setData({ loading: false });
    }
  },

  // 跳转到子页面
  goToPage: function (e) {
    const { path } = e.currentTarget.dataset;
    wx.navigateTo({ url: path });
  }
});