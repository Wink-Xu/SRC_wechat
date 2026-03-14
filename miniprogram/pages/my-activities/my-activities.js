// pages/my-activities/my-activities.js
const { activityApi } = require('../../utils/request');
const { formatDate } = require('../../utils/util');
const app = getApp();

Page({
  data: {
    checkedInActivities: [],
    loading: true
  },

  onLoad: function () {
    this.loadActivities();
  },

  onShow: function () {
    this.loadActivities();
  },

  loadActivities: async function () {
    this.setData({ loading: true });

    try {
      // 获取所有活动
      const result = await activityApi.getList({ status: 'all' });
      const activities = result.list || [];

      // 获取当前用户的报名记录
      const userId = app.globalData.userInfo?._id;
      if (!userId) {
        this.setData({ checkedInActivities: [], loading: false });
        return;
      }

      // 筛选出已签到的活动
      const checkedInActivities = activities
        .filter(activity => {
          // 检查是否有报名记录且已签到
          const registrations = activity.participants || [];
          const userRegistration = registrations.find(r => r.user_id === userId);
          return userRegistration && userRegistration.check_in_status === 'checked_in';
        })
        .map(activity => {
          // 格式化时间
          activity.formattedTime = formatDate(activity.start_time, 'YYYY 年 MM 月 DD 日');
          return activity;
        });

      this.setData({
        checkedInActivities,
        loading: false
      });
    } catch (error) {
      console.error('加载我的活动失败', error);
      this.setData({ loading: false });
    }
  },

  goToDetail: function (e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/activity-detail/activity-detail?id=${id}`
    });
  }
});
