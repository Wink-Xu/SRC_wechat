// pages/activities/activities.js
const { activityApi } = require('../../utils/request');
const { formatDate } = require('../../utils/util');
const { ACTIVITY_STATUS } = require('../../utils/constants');

Page({
  data: {
    ongoingActivities: [],  // 正在报名的活动
    pastActivities: [],     // 往期活动
    loading: true,
    loadingMore: false,
    hasMore: true,
    page: 1,
    pageSize: 10
  },

  onLoad: function () {
    this.loadActivities();
  },

  onShow: function () {
    this.refreshActivities();
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
    this.setData({ loading: true });

    try {
      const { page, pageSize } = this.data;

      // 加载正在报名的活动
      const ongoingResult = await activityApi.getList({
        page,
        limit: pageSize,
        status: 'published'
      }, { showLoad: false });

      // 加载往期活动
      const pastResult = await activityApi.getList({
        page,
        limit: pageSize,
        status: 'ended'
      }, { showLoad: false });

      // 跑步类型映射
      const runTypeMap = {
        road: '路跑',
        trail: '越野跑',
        hiking: '徒步',
        brand: '品牌合作跑'
      };

      const self = this;

      // 处理正在报名的活动
      const ongoingActivities = (ongoingResult.list || []).map(function(item) {
        return self.formatActivity(item, runTypeMap);
      });

      // 处理往期活动
      const pastActivities = (pastResult.list || []).map(function(item) {
        return self.formatActivity(item, runTypeMap);
      });

      this.setData({
        ongoingActivities: page === 1 ? ongoingActivities : [...this.data.ongoingActivities, ...ongoingActivities],
        pastActivities: page === 1 ? pastActivities : [...this.data.pastActivities, ...pastActivities],
        hasMore: ongoingActivities.length >= pageSize || pastActivities.length >= pageSize,
        loading: false
      });
    } catch (error) {
      console.error('加载活动列表失败', error);
      this.setData({ loading: false });
    }
  },

  // 格式化活动数据
  formatActivity: function(item, runTypeMap) {
    const formatted = {
      ...item,
      formattedTime: formatDate(item.start_time, 'MM 月 DD 日 HH:mm'),
      statusText: this.getStatusText(item.status),
      statusClass: this.getStatusClass(item.status),
      runTypeText: runTypeMap[item.run_type] || ''
    };

    // 格式化报名截止时间
    if (item.registration_deadline) {
      var deadlineDate = item.registration_deadline instanceof Date ? item.registration_deadline : new Date(item.registration_deadline);
      formatted.registration_deadline = formatDate(deadlineDate, 'MM-DD HH:mm');
    }

    return formatted;
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

  // 切换选项卡
  onTabChange: function (e) {
    const { key } = e.currentTarget.dataset;
    this.setData({
      currentTab: key,
      activities: [],
      page: 1,
      hasMore: true
    });
    this.loadActivities();
  },

  // 跳转到活动详情
  goToDetail: function (e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/activity-detail/activity-detail?id=${id}`
    });
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
  }
});
