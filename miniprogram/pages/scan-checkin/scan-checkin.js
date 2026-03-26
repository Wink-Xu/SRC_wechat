// pages/scan-checkin/scan-checkin.js
const { activityApi } = require('../../utils/request');
const app = getApp();

Page({
  data: {
    activity: null,
    loading: true,
    hasCheckedIn: false,
    checkInTime: '',
    error: null
  },

  onLoad: function (options) {
    console.log('扫码进入，options:', options);

    let activityId = null;

    // 小程序码扫码进入，scene 参数是活动 ID
    if (options.scene) {
      // decodeURIComponent 解码 scene
      const scene = decodeURIComponent(options.scene);
      console.log('scene:', scene);
      activityId = scene;
    }

    // 普通二维码扫码进入
    if (options.q || options.activity_id) {
      activityId = options.q || options.activity_id;
    }

    if (!activityId) {
      this.setData({
        loading: false,
        error: '无效的签到码'
      });
      return;
    }

    this.setData({ activityId });
    this.loadActivity(activityId);
  },

  // 加载活动信息
  loadActivity: async function (activityId) {
    try {
      const result = await activityApi.getDetail({ id: activityId });
      const activity = result.activity;

      // 检查活动状态
      if (!['published', 'ongoing'].includes(activity.status)) {
        this.setData({
          loading: false,
          error: '活动未开始或已结束，无法签到'
        });
        return;
      }

      // 检查是否已签到
      if (result.registration && result.registration.check_in_status === 'checked_in') {
        this.setData({
          hasCheckedIn: true,
          checkInTime: result.registration.checked_in_at
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
        loading: false,
        isRegistered: result.isRegistered
      });

      wx.setNavigationBarTitle({
        title: '活动签到'
      });
    } catch (error) {
      console.error('加载活动失败', error);
      this.setData({
        loading: false,
        error: '加载活动信息失败'
      });
    }
  },

  // 确认签到（团员自助签到）
  confirmCheckIn: async function () {
    // 检查登录状态
    if (!app.globalData.isLoggedIn) {
      wx.showModal({
        title: '请先登录',
        content: '登录后才能签到',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({
              url: '/pages/profile/profile'
            });
          }
        }
      });
      return;
    }

    // 检查是否是团员
    if (app.globalData.userInfo.status !== 'approved') {
      wx.showToast({
        title: '仅限正式团员签到',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '签到中...' });

    try {
      const result = await activityApi.selfCheckIn({ activityId: this.data.activityId });

      wx.hideLoading();

      this.setData({
        hasCheckedIn: true,
        checkInTime: new Date().toISOString()
      });

      wx.showModal({
        title: '签到成功',
        content: `签到成功！活动结束后将获得 ${result.points} 积分`,
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error?.message || '签到失败',
        icon: 'none'
      });
    }
  },

  // 去报名
  goToRegister: function () {
    wx.redirectTo({
      url: `/pages/activity-detail/activity-detail?id=${this.data.activityId}`
    });
  },

  // 返回
  goBack: function () {
    wx.navigateBack();
  }
});
