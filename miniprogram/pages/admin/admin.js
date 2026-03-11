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
    loading: true
  },

  onLoad: function () {
    if (!requireAdmin()) {
      setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 1500);
      return;
    }
    this.loadStatistics();
  },

  onShow: function () {
    this.loadStatistics();
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