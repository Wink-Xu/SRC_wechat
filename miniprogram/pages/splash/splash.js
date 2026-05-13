// pages/splash/splash.js
Page({
  data: {
    loading: true
  },

  onLoad: function () {
    // 提前初始化云开发（在 app.js 之前触发，缩短等待）
    if (wx.cloud && !wx.cloud.Cloud) {
      wx.cloud.init({
        env: 'cloud1-2gyhe7s5efa4155f',
        traceUser: true
      });
    }

    // 预加载首页数据 + 开屏动画，两者并行
    Promise.all([
      this.preloadHomePage(),
      this.showSplashAnimation()
    ]).then(() => {
      this.navigateToHome();
    }).catch(() => {
      // 即使预加载失败也跳转，让用户正常加载
      this.navigateToHome();
    });
  },

  // 预加载首页数据（静默）
  preloadHomePage: async function () {
    try {
      const { activityApi } = require('../../utils/request');
      // 静默预加载活动列表
      activityApi.getListOptimized({
        page: 1,
        limit: 10
      });
      // 不等待结果，只是触发请求
    } catch (e) {
      // 忽略预加载错误
    }
  },

  // 开屏动画（至少展示 1 秒）
  showSplashAnimation: function () {
    return new Promise((resolve) => {
      setTimeout(resolve, 1200);
    });
  },

  // 跳转到首页
  navigateToHome: function () {
    this.setData({ loading: false });
    wx.reLaunch({
      url: '/pages/home/home'
    });
  }
});
