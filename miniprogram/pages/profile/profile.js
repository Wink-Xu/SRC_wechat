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
    useMock: false,
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
    const userInfo = app.globalData.userInfo;

    this.setData({
      isLoggedIn,
      userInfo,
      isAdmin: app.globalData.isAdmin,
      isLeader: app.globalData.isLeader,
      isMember: app.globalData.isMember,
      isPending: userInfo && userInfo.status === 'pending',
      useMock: app.USE_MOCK,
      points: 0,
      activityCount: 0
    });

    // 获取积分和活动次数（仅团员）
    if (isLoggedIn && app.globalData.isMember) {
      try {
        const pointsResult = await pointsApi.getBalance();
        this.setData({ points: pointsResult.points || 0 });

        // 获取活动次数（已签到的活动数量）
        const activityResult = await activityApi.getList({ status: 'all' });
        const activities = activityResult.list || [];
        const userId = app.globalData.userInfo?._id;

        // 筛选已签到的活动
        const checkedInActivities = activities.filter(activity => {
          const registrations = activity.participants || [];
          const userRegistration = registrations.find(r => r.user_id === userId);
          return userRegistration && userRegistration.check_in_status === 'checked_in';
        });

        this.setData({ activityCount: checkedInActivities.length });
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

  // 跳转到调试页面（角色切换）
  goToDebug: function () {
    wx.navigateTo({
      url: '/pages/debug/debug'
    });
  },

  // 跳转到测试工具面板
  goToTestPanel: function () {
    wx.navigateTo({
      url: '/pages/test-panel/test-panel'
    });
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
  }
});
