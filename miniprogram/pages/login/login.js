// pages/login/login.js
const { userApi } = require('../../utils/request');
const { isValidPhone } = require('../../utils/util');

Page({
  data: {
    step: 'login', // login | apply
    loading: false,
    code: '',
    avatarUrl: '',
    nickname: '',
    phone: ''
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

  // 选择头像
  onChooseAvatar: function (e) {
    const { avatarUrl } = e.detail;
    this.setData({ avatarUrl });
  },

  // 输入昵称
  onNicknameInput: function (e) {
    this.setData({ nickname: e.detail.value });
  },

  // 输入手机号
  onPhoneInput: function (e) {
    this.setData({ phone: e.detail.value });
  },

  // 微信登录 - 获取用户信息
  handleGetUserProfile: function () {
    this.doLogin();
  },

  // 执行登录
  doLogin: async function () {
    this.setData({ loading: true });

    try {
      // Mock 模式下直接使用模拟数据
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

      if (result.status === 'approved') {
        // 已是团员，返回首页（活动页）
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        });
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/activities/activities'
          });
        }, 1000);
      } else if (result.status === 'pending') {
        // 待审批
        wx.showModal({
          title: '提示',
          content: '您的入团申请正在审核中，请耐心等待',
          showCancel: false,
          success: () => {
            wx.switchTab({
              url: '/pages/activities/activities'
            });
          }
        });
      } else {
        // 需要申请入团
        this.setData({
          step: 'apply'
        });
      }
    } catch (error) {
      console.error('登录失败', error);
    } finally {
      this.setData({ loading: false });
    }
  },

  // 提交申请
  submitApply: async function () {
    const { nickname, phone } = this.data;

    if (!nickname || nickname.trim().length === 0) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      });
      return;
    }

    if (!phone || !isValidPhone(phone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true });

    try {
      const app = getApp();

      if (app.USE_MOCK) {
        // Mock 模式下直接更新用户信息
        const mockData = require('../../utils/mock-data');
        const result = {
          ...mockData.currentUser,
          nickname: nickname.trim(),
          phone: phone.trim(),
          status: 'pending'
        };
        app.updateUserInfo(result);
        console.log('[Mock Mode] 模拟入团申请');
      } else {
        await userApi.applyMembership({
          nickname: nickname.trim(),
          phone: phone.trim()
        });
      }

      wx.showModal({
        title: '申请成功',
        content: '您的入团申请已提交，请等待管理员审核',
        showCancel: false,
        success: () => {
          wx.switchTab({
            url: '/pages/activities/activities'
          });
        }
      });
    } catch (error) {
      console.error('申请失败', error);
    } finally {
      this.setData({ loading: false });
    }
  },

  // 返回首页（暂不登录）
  goBack: function () {
    wx.switchTab({
      url: '/pages/activities/activities'
    });
  }
});
