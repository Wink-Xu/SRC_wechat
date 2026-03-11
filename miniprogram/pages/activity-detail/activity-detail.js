// pages/activity-detail/activity-detail.js
const { activityApi } = require('../../utils/request');
const { formatDate, showConfirm, showSuccess, showInfo } = require('../../utils/util');
const { isMember, isAdmin } = require('../../utils/auth');

Page({
  data: {
    id: '',
    activity: null,
    loading: true,
    isRegistered: false,
    registration: null,
    participants: [],
    runTypeText: ''
  },

  onLoad: function (options) {
    if (options.id) {
      this.setData({ id: options.id });
      this.loadActivity();
    }
  },

  // 加载活动详情
  loadActivity: async function () {
    this.setData({ loading: true });

    try {
      const result = await activityApi.getDetail({ id: this.data.id });

      const activity = result.activity;
      activity.formattedTime = formatDate(activity.start_time, 'YYYY年MM月DD日 HH:mm');
      activity.formattedEndTime = formatDate(activity.end_time, 'HH:mm');
      activity.statusText = this.getStatusText(activity.status);
      activity.statusClass = this.getStatusClass(activity.status);

      // 格式化报名截止时间
      if (activity.registration_deadline) {
        activity.registration_deadline = formatDate(activity.registration_deadline, 'YYYY-MM-DD');
      }

      // 跑步类型文本
      const runTypeMap = {
        road: '路跑',
        trail: '越野跑',
        hiking: '徒步',
        brand: '品牌合作跑'
      };
      const runTypeText = runTypeMap[activity.run_type] || '路跑';

      this.setData({
        activity,
        isRegistered: result.isRegistered,
        registration: result.registration,
        participants: result.participants || [],
        runTypeText,
        loading: false
      });

      wx.setNavigationBarTitle({
        title: activity.title
      });
    } catch (error) {
      console.error('加载活动详情失败', error);
      this.setData({ loading: false });
    }
  },

  // 报名活动
  handleRegister: async function () {
    if (!isMember()) {
      showInfo('请先登录并成为团员');
      return;
    }

    const confirm = await showConfirm('确认报名', '确定要报名参加此活动吗？');
    if (!confirm) return;

    try {
      await activityApi.register({ activityId: this.data.id });
      showSuccess('报名成功');
      this.loadActivity();
    } catch (error) {
      console.error('报名失败', error);
    }
  },

  // 取消报名
  handleCancelRegistration: async function () {
    const confirm = await showConfirm('取消报名', '确定要取消报名吗？');
    if (!confirm) return;

    try {
      await activityApi.cancelRegistration({ activityId: this.data.id });
      showSuccess('已取消报名');
      this.loadActivity();
    } catch (error) {
      console.error('取消报名失败', error);
    }
  },

  // 签到
  handleCheckIn: async function () {
    if (!isAdmin()) {
      showInfo('您没有签到权限');
      return;
    }

    const confirm = await showConfirm('确认签到', '确定要为该用户签到吗？');
    if (!confirm) return;

    try {
      await activityApi.checkIn({
        activityId: this.data.id,
        userId: this.data.registration.user_id
      });
      showSuccess('签到成功');
      this.loadActivity();
    } catch (error) {
      console.error('签到失败', error);
    }
  },

  // 编辑活动
  handleEdit: function () {
    wx.navigateTo({
      url: `/pages/activity-create/activity-create?id=${this.data.id}`
    });
  },

  // 查看报名名单
  viewParticipants: function () {
    wx.navigateTo({
      url: `/pages/activity-participants/activity-participants?id=${this.data.id}`
    });
  },

  // 发布活动
  handlePublish: async function () {
    const confirm = await showConfirm('发布活动', '确定要发布此活动吗？发布后团员可以报名。');
    if (!confirm) return;

    try {
      await activityApi.publish({ id: this.data.id });
      showSuccess('发布成功');
      this.loadActivity();
    } catch (error) {
      console.error('发布失败', error);
    }
  },

  // 取消活动
  handleCancel: async function () {
    const confirm = await showConfirm('取消活动', '确定要取消此活动吗？取消后将通知已报名的团员。');
    if (!confirm) return;

    try {
      await activityApi.cancel({ id: this.data.id });
      showSuccess('活动已取消');
      this.loadActivity();
    } catch (error) {
      console.error('取消活动失败', error);
    }
  },

  // 获取状态文本
  getStatusText: function (status) {
    const statusMap = {
      draft: '草稿',
      published: '报名中',
      ongoing: '进行中',
      ended: '已结束',
      cancelled: '已取消'
    };
    return statusMap[status] || status;
  },

  // 获取状态样式类
  getStatusClass: function (status) {
    const classMap = {
      draft: 'tag-warning',
      published: 'tag-primary',
      ongoing: 'tag-success',
      ended: 'tag-secondary',
      cancelled: 'tag-error'
    };
    return classMap[status] || '';
  },

  // 分享
  onShareAppMessage: function () {
    return {
      title: this.data.activity?.title || '活动邀请',
      path: `/pages/activity-detail/activity-detail?id=${this.data.id}`
    };
  }
});