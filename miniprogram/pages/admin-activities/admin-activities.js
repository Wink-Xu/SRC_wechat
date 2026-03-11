// pages/admin-activities/admin-activities.js
const { activityApi } = require('../../utils/request');
const { formatDate, showSuccess, showConfirm } = require('../../utils/util');
const { requireAdmin } = require('../../utils/auth');

Page({
  data: {
    activities: [],
    loading: true,
    loadingMore: false,
    hasMore: true,
    page: 1,
    pageSize: 10
  },

  onLoad: function () {
    if (!requireAdmin()) {
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }
    this.loadActivities();
  },

  onPullDownRefresh: function () {
    this.refreshActivities().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom: function () {
    if (this.data.hasMore && !this.data.loadingMore) {
      this.loadMoreActivities();
    }
  },

  // 刷新活动列表
  refreshActivities: async function () {
    this.setData({
      page: 1,
      hasMore: true,
      activities: []
    });
    return this.loadActivities();
  },

  // 加载活动列表
  loadActivities: async function () {
    const { page, pageSize } = this.data;

    console.log('[AdminActivities] 开始加载活动，page:', page, 'pageSize:', pageSize);

    try {
      const result = await activityApi.getList({
        page,
        limit: pageSize,
        all: true // 获取所有状态的活动
      });

      console.log('[AdminActivities] API 返回结果:', result);

      const activities = (result.list || []).map(item => ({
        ...item,
        formattedTime: formatDate(item.start_time, 'MM-DD HH:mm'),
        statusText: this.getStatusText(item.status)
      }));

      console.log('[AdminActivities] 格式化后的活动数量:', activities.length);

      this.setData({
        activities: page === 1 ? activities : [...this.data.activities, ...activities],
        hasMore: activities.length >= pageSize,
        loading: false
      });

      console.log('[AdminActivities] setData 完成，当前活动数量:', this.data.activities.length);
    } catch (error) {
      console.error('加载活动列表失败', error);
      this.setData({ loading: false });
    }
  },

  // 加载更多
  loadMoreActivities: async function () {
    this.setData({
      loadingMore: true,
      page: this.data.page + 1
    });

    try {
      await this.loadActivities();
    } finally {
      this.setData({ loadingMore: false });
    }
  },

  // 创建活动
  createActivity: function () {
    wx.navigateTo({
      url: '/pages/activity-create/activity-create'
    });
  },

  // 编辑活动
  editActivity: function (e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/activity-create/activity-create?id=${id}`
    });
  },

  // 发布活动
  publishActivity: async function (e) {
    const { id } = e.currentTarget.dataset;

    const confirm = await showConfirm('发布活动', '确定要发布此活动吗？');
    if (!confirm) return;

    try {
      await activityApi.publish({ id });
      showSuccess('发布成功');
      this.refreshActivities();
    } catch (error) {
      console.error('发布失败', error);
    }
  },

  // 取消活动
  cancelActivity: async function (e) {
    const { id } = e.currentTarget.dataset;

    const confirm = await showConfirm('取消活动', '确定要取消此活动吗？');
    if (!confirm) return;

    try {
      await activityApi.cancel({ id });
      showSuccess('已取消');
      this.refreshActivities();
    } catch (error) {
      console.error('取消失败', error);
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
  }
});