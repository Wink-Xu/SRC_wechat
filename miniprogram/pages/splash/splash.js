// pages/splash/splash.js
Page({
  data: {
    loading: true
  },

  onLoad: function () {
    // 提前初始化云开发（在 app.js 之前触发，缩短等待）
    if (wx.cloud && !wx.cloud.Cloud) {
      wx.cloud.init({
        env: 'xu-d4gjbs6ta5207acb7',
        traceUser: true
      });
    }

    // 直接跳转到首页，无开屏延迟
    this.navigateToHome();
  },

  // 跳转到首页
  navigateToHome: function () {
    wx.reLaunch({
      url: '/pages/home/home'
    });
  }
});
