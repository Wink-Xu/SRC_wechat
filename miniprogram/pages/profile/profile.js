// pages/profile/profile.js
const { userApi, pointsApi } = require('../../utils/request');
const { formatPhone, showSuccess, showConfirm, showInfo } = require('../../utils/util');
const { isLoggedIn, isAdmin, isLeader } = require('../../utils/auth');
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
    menuItems: [
      { icon: 'points', title: '积分中心', path: '/pages/points/points' },
      { icon: 'order', title: '我的订单', path: '/pages/orders/orders' }
    ],
    adminMenus: [
      { icon: 'user', title: '成员管理', path: '/pages/admin-members/admin-members' },
      { icon: 'activity', title: '活动管理', path: '/pages/admin-activities/admin-activities' },
      { icon: 'product', title: '商品管理', path: '/pages/admin-products/admin-products' },
      { icon: 'order', title: '订单管理', path: '/pages/admin-orders/admin-orders' }
    ]
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
      points: 0
    });

    // 获取积分
    if (isLoggedIn && app.globalData.isMember) {
      try {
        const result = await pointsApi.getBalance();
        this.setData({ points: result.points || 0 });
      } catch (error) {
        console.error('获取积分失败', error);
      }
    }
  },

  // 跳转到调试页面（角色切换）
  goToDebug: function () {
    wx.navigateTo({
      url: '/pages/debug/debug'
    });
  },

  // 跳转到登录
  goToLogin: function () {
    wx.navigateTo({
      url: '/pages/login/login'
    });
  },

  // 跳转到申请入团页面
  goToApply: function () {
    wx.navigateTo({
      url: '/pages/apply-membership/apply-membership'
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

  // 跳转到管理后台
  goToAdmin: function () {
    wx.navigateTo({
      url: '/pages/admin/admin'
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
      points: 0
    });

    showSuccess('已退出登录');
  },

  // 格式化手机号
  formatPhone: function (phone) {
    return formatPhone(phone);
  }
});