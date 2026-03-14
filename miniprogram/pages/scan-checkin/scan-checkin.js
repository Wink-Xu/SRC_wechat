// pages/scan-checkin/scan-checkin.js
const { activityApi } = require('../../utils/request');
const app = getApp();

Page({
  data: {
    activity: null,
    loading: true,
    hasCheckedIn: false,
    checkInTime: ''
  },

  onLoad: function (options) {
    // 从扫码进入，options.scene 包含二维码内容
    console.log('扫码进入，options:', options);

    let qrData;
    try {
      // 尝试解析二维码内容
      qrData = JSON.parse(options.scene || '{}');
    } catch (e) {
      qrData = { type: 'checkin', activity_id: options.scene };
    }

    if (qrData.type !== 'checkin' || !qrData.activity_id) {
      wx.showToast({
        title: '无效的签到码',
        icon: 'none'
      });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    this.setData({ activityId: qrData.activity_id });
    this.loadActivity(qrData.activity_id);
  },

  // 加载活动信息
  loadActivity: async function (activityId) {
    try {
      const result = await activityApi.getDetail({ id: activityId });
      const activity = result.activity;

      // 检查活动状态
      if (activity.status !== 'ongoing' && activity.status !== 'published') {
        wx.showToast({
          title: '活动未开始或已结束',
          icon: 'none'
        });
        setTimeout(() => wx.navigateBack(), 1500);
        return;
      }

      // 检查是否已报名
      if (!result.isRegistered) {
        wx.showModal({
          title: '提示',
          content: '您还未报名参加此活动，请先报名',
          showCancel: false,
          success: () => {
            wx.navigateBack();
          }
        });
        return;
      }

      // 检查是否已签到
      if (result.registration && result.registration.check_in_status === 'checked_in') {
        this.setData({
          hasCheckedIn: true,
          checkInTime: result.registration.check_in_time
        });
      }

      // 格式化时间
      const startDate = new Date(activity.start_time);
      const formattedTime = `${startDate.getMonth() + 1}月${startDate.getDate()}日 ${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`;

      this.setData({
        activity: {
          ...activity,
          formattedTime
        },
        loading: false
      });

      wx.setNavigationBarTitle({
        title: '活动签到'
      });
    } catch (error) {
      console.error('加载活动失败', error);
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  // 确认签到
  confirmCheckIn: async function () {
    wx.showLoading({
      title: '签到中...'
    });

    try {
      await activityApi.checkIn({ activityId: this.data.activityId });

      wx.hideLoading();

      // 显示签到成功动画
      this.setData({
        hasCheckedIn: true,
        checkInTime: new Date().toISOString()
      });

      wx.showToast({
        title: '签到成功',
        icon: 'success'
      });

      // 1.5 秒后返回
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error?.message || '签到失败，请重试',
        icon: 'none'
      });
    }
  },

  // 返回
  goBack: function () {
    wx.navigateBack();
  }
});
