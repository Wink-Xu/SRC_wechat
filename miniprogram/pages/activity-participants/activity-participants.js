// pages/activity-participants/activity-participants.js
const { activityApi } = require('../../utils/request');

Page({
  data: {
    id: '',
    activity: null,
    participants: [],
    loading: true
  },

  onLoad: function (options) {
    if (options.id) {
      this.setData({ id: options.id });
      this.loadParticipants();
    }
  },

  // 加载报名名单
  loadParticipants: async function () {
    this.setData({ loading: true });

    try {
      const result = await activityApi.getDetail({ id: this.data.id });

      this.setData({
        activity: result.activity,
        participants: result.participants || [],
        loading: false
      });

      wx.setNavigationBarTitle({
        title: `报名名单 (${this.data.participants.length}人)`
      });
    } catch (error) {
      console.error('加载报名名单失败', error);
      this.setData({ loading: false });
    }
  }
});
