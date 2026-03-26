// pages/index/index.js
const { activityApi, pointsApi } = require('../../utils/request');
const { formatDate } = require('../../utils/util');
const { isLoggedIn, isMember } = require('../../utils/auth');
const app = getApp();

Page({
  data: {
    userInfo: null,
    isLoggedIn: false,
    isMember: false,
    latestActivities: [],
    points: 0,
    loading: true
  },

  onLoad: function () {
    this.loadData();
  },

  onShow: function () {
    // 刷新用户状态
    this.setData({
      isLoggedIn: app.globalData.isLoggedIn,
      isMember: app.globalData.isMember,
      userInfo: app.globalData.userInfo
    });
  },

  onPullDownRefresh: function () {
    this.loadData().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 加载数据
  loadData: async function () {
    try {
      // 获取最新活动
      const activitiesRes = await activityApi.getList({
        status: 'ongoing',
        limit: 3
      });

      // 兼容 Mock API 返回格式
      const activitiesList = activitiesRes.list || activitiesRes || [];

      this.setData({
        latestActivities: activitiesList,
        loading: false
      });

      // 如果已登录，获取积分
      if (app.globalData.isMember) {
        const pointsData = await pointsApi.getBalance();
        this.setData({
          points: pointsData.points || 0
        });
      }
    } catch (error) {
      console.error('加载数据失败', error);
      this.setData({ loading: false });
    }
  },

  // 跳转到登录
  goToLogin: function () {
    wx.navigateTo({
      url: '/pages/login/login'
    });
  },

  // 跳转到活动详情
  goToActivity: function (e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/activity-detail/activity-detail?id=${id}`
    });
  },

  // 跳转到活动列表
  goToActivities: function () {
    wx.switchTab({
      url: '/pages/activities/activities'
    });
  },

  // 跳转到积分榜
  goToPointsRank: function () {
    wx.navigateTo({
      url: '/pages/points-rank/points-rank'
    });
  },

  // 格式化日期
  formatDate: function (date) {
    return formatDate(date, 'MM月DD日 HH:mm');
  }
});