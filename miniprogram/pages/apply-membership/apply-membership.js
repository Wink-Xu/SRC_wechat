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
    const { nickname, phone, avatarUrl } = this.data;

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
      let avatarFileID = avatarUrl;

      // 如果头像是本地临时路径，上传到云存储
      if (avatarUrl && (avatarUrl.startsWith('http://tmp/') || avatarUrl.startsWith('wxfile://'))) {
        const uploadResult = await wx.cloud.uploadFile({
          cloudPath: `user_avatars/${app.globalData.userInfo?._id || Date.now()}/${Date.now()}.png`,
          filePath: avatarUrl
        });
        avatarFileID = uploadResult.fileID;
      }

      // 先更新头像和昵称
      await userApi.updateProfile({
        nickname: nickname.trim(),
        avatar: avatarFileID
      });

      // 调用云函数申请入团
      await userApi.applyMembership({
        nickname: nickname.trim(),
        phone: phone.trim()
      });

      // 更新本地用户状态为 pending
      const userInfo = app.globalData.userInfo || {};
      userInfo.nickname = nickname.trim();
      userInfo.avatar = avatarFileID || userInfo.avatar;
      userInfo.status = 'pending';
      app.globalData.userInfo = userInfo;
      app.globalData.isPending = true;
      wx.setStorageSync('userInfo', userInfo);

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
