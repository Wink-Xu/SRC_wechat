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
    // 静默补充订阅授权（勾选「不再询问」后无弹窗，自动续期）
    this.renewSubscribe();
  },

  // 静默补充订阅授权
  renewSubscribe: function () {
    wx.requestSubscribeMessage({
      tmplIds: ['DhgaV9rp_Cd9Iwj9OrbHu5MCM-954nzKfInFHsVDpUg'],
      success: (res) => { console.log('订阅授权结果:', res); },
      fail: (err) => { console.log('订阅授权失败（可忽略）:', err); }
    });
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