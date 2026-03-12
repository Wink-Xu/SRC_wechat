// pages/apply-membership/apply-membership.js
const { userApi } = require('../../utils/request');
const { isValidPhone } = require('../../utils/util');
const { showSuccess, showInfo } = require('../../utils/util');

Page({
  data: {
    loading: false,
    avatarUrl: '',
    nickname: '',
    phone: ''
  },

  onLoad: function () {
    // 加载当前用户信息
    const app = getApp();
    const userInfo = app.globalData.userInfo;
    if (userInfo) {
      this.setData({
        nickname: userInfo.nickname || '',
        avatarUrl: userInfo.avatar || ''
      });
    }
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

  // 提交申请
  submitApply: async function () {
    const { nickname, phone } = this.data;

    if (!nickname || nickname.trim().length === 0) {
      showInfo('请输入昵称');
      return;
    }

    if (!phone || !isValidPhone(phone)) {
      showInfo('请输入正确的手机号');
      return;
    }

    this.setData({ loading: true });

    try {
      const app = getApp();

      if (app.USE_MOCK) {
        // Mock 模式下直接更新用户信息
        const result = {
          ...app.globalData.userInfo,
          nickname: nickname.trim(),
          phone: phone.trim(),
          avatar: this.data.avatarUrl,
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

      showSuccess('申请成功，请等待审核');

      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (error) {
      console.error('申请失败', error);
      showInfo('申请失败，请重试');
    } finally {
      this.setData({ loading: false });
    }
  }
});
