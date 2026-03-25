// pages/init/init.js - 初始化页面
const { callFunction } = require('../../utils/request');

Page({
  data: {
    status: 'initializing',
    message: '正在初始化数据库...',
    results: []
  },

  onLoad: function () {
    this.initializeDatabase();
  },

  async initializeDatabase() {
    try {
      this.setData({ message: '正在创建数据库集合...' });

      const result = await callFunction('init', 'main', {}, {
        showLoad: false,
        showErrorMsg: false
      });

      console.log('初始化结果:', result);

      const resultsText = [];
      if (result && result.data && result.data.collections) {
        for (const [key, value] of Object.entries(result.data.collections)) {
          resultsText.push(`${key}: ${value === 'created' ? '✅ 已创建' : value === 'exists' ? '✅ 已存在' : '❌ ' + value}`);
        }
      }

      this.setData({
        status: 'completed',
        message: '初始化完成！',
        results: resultsText
      });

      // 3 秒后自动跳转到首页
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/activities/activities'
        });
      }, 3000);

    } catch (error) {
      console.error('初始化失败:', error);
      this.setData({
        status: 'error',
        message: '初始化失败：' + (error.message || '请重试'),
        results: [error.message || '未知错误']
      });
    }
  },

  retry: function() {
    this.setData({
      status: 'initializing',
      message: '正在初始化数据库...',
      results: []
    });
    this.initializeDatabase();
  }
});
