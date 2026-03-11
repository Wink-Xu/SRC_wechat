// pages/activity-participants/activity-participants.js
const { activityApi } = require('../../utils/request');
const { showSuccess, showConfirm } = require('../../utils/util');
const { requireAdmin } = require('../../utils/auth');

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
  },

  // 签到
  handleCheckIn: async function (e) {
    if (!requireAdmin()) return;

    const { userId, nickname } = e.currentTarget.dataset;

    const confirm = await showConfirm('确认签到', `确定要为 ${nickname} 签到吗？签到后将发放积分。`);
    if (!confirm) return;

    try {
      await activityApi.checkIn({
        activityId: this.data.id,
        userId
      });
      showSuccess('签到成功');
      this.loadParticipants();
    } catch (error) {
      console.error('签到失败', error);
    }
  },

  // 取消签到
  handleCancelCheckIn: async function (e) {
    if (!requireAdmin()) return;

    const { userId, nickname } = e.currentTarget.dataset;

    const confirm = await showConfirm('取消签到', `确定要取消 ${nickname} 的签到记录吗？`);
    if (!confirm) return;

    try {
      // TODO: 需要实现取消签到的 API
      showSuccess('已取消签到');
      this.loadParticipants();
    } catch (error) {
      console.error('取消签到失败', error);
    }
  }
});
