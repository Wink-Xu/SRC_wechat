// pages/profile/profile.js
const { userApi, pointsApi, activityApi } = require('../../utils/request');
const { formatPhone, showSuccess, showConfirm, showInfo } = require('../../utils/util');
const app = getApp();

Page({
  data: {
    userInfo: null,
    isLoggedIn: false,
    isAdmin: false,
    isLeader: false,
    isMember: false,    // 是否是团员（已批准）
    isPending: false,   // 是否待审批
    openid: '',         // 临时显示 openid
    points: 0,
    activityCount: 0
  },

  onLoad: function () {
    // 初始状态
  },

  onShow: function () {
    this.refreshUserInfo();
  },

  // 刷新用户信息
  refreshUserInfo: async function () {
    const app = getApp();
    const isLoggedIn = app.globalData.isLoggedIn;
    let userInfo = app.globalData.userInfo;

    // 处理头像：如果是 cloud:// 开头，需要转换为临时 URL
    if (userInfo && userInfo.avatar && userInfo.avatar.startsWith('cloud://')) {
      try {
        const tempUrlResult = await wx.cloud.getTempFileURL({
          fileList: [userInfo.avatar]
        });
        if (tempUrlResult.fileList[0]?.tempURL) {
          userInfo = { ...userInfo, displayAvatar: tempUrlResult.fileList[0].tempURL };
        }
      } catch (err) {
        console.error('获取头像临时链接失败', err);
      }
    } else if (userInfo && userInfo.avatar) {
      userInfo = { ...userInfo, displayAvatar: userInfo.avatar };
    }

    this.setData({
      isLoggedIn,
      userInfo,
      isAdmin: app.globalData.isAdmin,
      isLeader: app.globalData.isLeader,
      isMember: app.globalData.isMember,
      isPending: userInfo && userInfo.status === 'pending',
      openid: userInfo?.openid || '', // 显示 openid
      points: 0,
      activityCount: 0
    });

    // 获取积分和活动次数（仅团员）
    if (isLoggedIn && app.globalData.isMember) {
      try {
        const pointsResult = await pointsApi.getBalance();
        this.setData({ points: pointsResult.points || 0 });

        // 获取活动次数（已签到的活动数量）
        const activityResult = await activityApi.getList({ registered: true });
        const activities = activityResult.list || [];

        // 筛选已签到的活动
        const checkedInCount = activities.filter(activity => activity.user_checked_in).length;

        this.setData({ activityCount: checkedInCount });
      } catch (error) {
        console.error('获取积分失败', error);
      }
    }
  },

  // 微信授权登录
  handleLogin: async function () {
    try {
      const app = getApp();
      await app.handleLogin();

      // 登录成功，刷新页面
      this.refreshUserInfo();

      wx.showToast({
        title: '登录成功',
        icon: 'success'
      });
    } catch (error) {
      console.error('登录失败', error);
      if (error.errMsg && error.errMsg.includes('auth deny')) {
        // 用户拒绝授权
        wx.showToast({
          title: '你已拒绝授权',
          icon: 'none'
        });
      } else {
        wx.showToast({
          title: '登录失败，请重试',
          icon: 'none'
        });
      }
    }
  },

  // 跳转到申请入团页面
  goToApply: function () {
    wx.navigateTo({
      url: '/pages/apply-membership/apply-membership'
    });
  },

  // 跳转到我的活动页面
  goToMyActivities: function () {
    console.log('goToMyActivities 被调用，isLoggedIn:', this.data.isLoggedIn);
    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    console.log('准备跳转到 /pages/my-activities/my-activities');
    wx.navigateTo({
      url: '/pages/my-activities/my-activities'
    });
  },

  // 跳转到页面（需要登录）
  goToPage: function (e) {
    const { path } = e.currentTarget.dataset;

    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    wx.navigateTo({ url: path });
  },

  // 退出登录
  handleLogout: async function () {
    const confirm = await showConfirm('退出登录', '确定要退出登录吗？');
    if (!confirm) return;

    const app = getApp();
    app.clearUserInfo();

    this.setData({
      isLoggedIn: false,
      userInfo: null,
      points: 0,
      activityCount: 0
    });

    showSuccess('已退出登录');
  },

  // 修改头像
  changeAvatar: async function () {
    const that = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        const tempFilePath = res.tempFilePaths[0];

        wx.showLoading({ title: '上传中...' });

        // 上传到云存储
        wx.cloud.uploadFile({
          cloudPath: `user_avatars/${that.data.userInfo._id || Date.now()}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.png`,
          filePath: tempFilePath,
          isPrivate: false,
          success: async function (uploadRes) {
            // 更新用户头像
            try {
              const { userApi } = require('../../utils/request');
              await userApi.updateProfile({
                avatar: uploadRes.fileID
              });

              // 更新全局用户信息
              const app = getApp();
              if (app.globalData.userInfo) {
                app.globalData.userInfo.avatar = uploadRes.fileID;
              }

              wx.hideLoading();
              showSuccess('头像更新成功');

              // 刷新页面
              that.refreshUserInfo();
            } catch (error) {
              wx.hideLoading();
              console.error('更新头像失败', error);
              wx.showToast({
                title: '更新失败',
                icon: 'none'
              });
            }
          },
          fail: function (uploadErr) {
            wx.hideLoading();
            console.error('上传图片失败', uploadErr);
            wx.showToast({
              title: '上传失败',
              icon: 'none'
            });
          }
        });
      },
      fail: function (err) {
        console.error('选择图片失败', err);
      }
    });
  }
});
