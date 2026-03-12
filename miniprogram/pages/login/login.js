// pages/login/login.js
const { userApi } = require('../../utils/request');

Page({
  data: {
    loading: false,
    code: ''
  },

  onLoad: function () {
    // Mock 模式下跳过微信登录
    const app = getApp();
    if (app.USE_MOCK) {
      console.log('[Mock Mode] 跳过微信登录，直接使用模拟数据');
      return;
    }

    // 获取微信登录 code
    wx.login({
      success: (res) => {
        if (res.code) {
          this.setData({ code: res.code });
        } else {
          console.error('登录失败', res.errMsg);
        }
      }
    });
  },

  // 微信登录
  handleLogin: async function () {
    this.setData({ loading: true });

    try {
      const app = getApp();
      let result;

      if (app.USE_MOCK) {
        const mockData = require('../../utils/mock-data');
        result = mockData.currentUser;
        console.log('[Mock Mode] 使用模拟用户数据登录');
      } else {
        // 先调用云函数登录，获取用户信息
        result = await userApi.login({
          code: this.data.code
        }, { showLoad: false });
      }

      // 更新全局状态
      app.updateUserInfo(result);

      wx.showToast({
        title: '登录成功',
        icon: 'success'
      });

      // 所有用户登录后都进入首页
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/activities/activities'
        });
      }, 1000);
    } catch (error) {
      console.error('登录失败', error);
    } finally {
      this.setData({ loading: false });
    }
  }
});
