// pages/activities/activities.js
const { activityApi } = require('../../utils/request');
const { formatDate } = require('../../utils/util');
const { ACTIVITY_STATUS } = require('../../utils/constants');

Page({
  data: {
    activities: [],
    loading: true,
    loadingMore: false,
    hasMore: true,
    page: 1,
    pageSize: 10,
    currentTab: 'all', // all | registered | created
    tabs: [
      { key: 'all', title: '全部活动' },
      { key: 'registered', title: '我报名的' }
    ],
    isAdminOrLeader: false
  },

  onLoad: function () {
    // 检查是否是管理员或团长
    const app = getApp();
    const isAdminOrLeader = app.globalData.isAdmin || app.globalData.isLeader;

    // 只有管理员/团长才显示"我创建的"选项卡
    if (isAdminOrLeader) {
      this.data.tabs.push({ key: 'created', title: '我创建的' });
    }

    this.setData({ isAdminOrLeader });
    this.loadActivities();
  },

  onShow: function () {
    // 每次显示时刷新列表（确保创建的活动能立即显示）
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
      const { currentTab, page, pageSize } = this.data;
      const params = {
        page,
        limit: pageSize
      };

      // 根据当前选项卡设置过滤条件
      if (currentTab === 'registered') {
        params.registered = true;
      } else if (currentTab === 'created') {
        params.createdByMe = true;
      } else {
        params.status = 'published';
      }

      console.log('[Activities] 加载活动，currentTab:', currentTab, 'params:', params);

      const result = await activityApi.getList(params, { showLoad: false });

      console.log('[Activities] API 返回结果:', result);

      // 跑步类型映射
      const runTypeMap = {
        road: '路跑',
        trail: '越野跑',
        hiking: '徒步',
        brand: '品牌合作跑'
      };

      const self = this;
      const activities = (result.list || []).map(function(item) {
        var formatted = {
          ...item,
          formattedTime: formatDate(item.start_time, 'MM 月 DD 日 HH:mm'),
          statusText: self.getStatusText(item.status),
          statusClass: self.getStatusClass(item.status),
          runTypeText: runTypeMap[item.run_type] || ''
        };

        // 格式化报名截止时间
        if (item.registration_deadline) {
          var deadlineDate = item.registration_deadline instanceof Date ? item.registration_deadline : new Date(item.registration_deadline);
          formatted.registration_deadline = formatDate(deadlineDate, 'MM-DD HH:mm');
        }

        return formatted;
      });

      console.log('[Activities] 格式化后的活动数量:', activities.length);

      this.setData({
        activities: page === 1 ? activities : [...this.data.activities, ...activities],
        hasMore: activities.length >= pageSize,
        loading: false
      });

      console.log('[Activities] setData 完成，currentTab:', currentTab, '活动数量:', this.data.activities.length);
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
