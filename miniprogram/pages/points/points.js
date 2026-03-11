// pages/points/points.js
const { pointsApi } = require('../../utils/request');
const { formatDate } = require('../../utils/util');
const { requireMember } = require('../../utils/auth');

Page({
  data: {
    points: 0,
    logs: [],
    loading: true,
    loadingMore: false,
    hasMore: true,
    page: 1,
    pageSize: 20
  },

  onLoad: function () {
    if (!requireMember()) {
      setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 1500);
      return;
    }
    this.loadData();
  },

  onPullDownRefresh: function () {
    this.refreshData().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom: function () {
    if (this.data.hasMore && !this.data.loadingMore) {
      this.loadMoreLogs();
    }
  },

  // 刷新数据
  refreshData: async function () {
    this.setData({
      page: 1,
      hasMore: true,
      logs: []
    });
    return this.loadData();
  },

  // 加载数据
  loadData: async function () {
    try {
      // 获取积分余额
      const balanceData = await pointsApi.getBalance();
      this.setData({ points: balanceData.points || 0 });

      // 获取积分记录
      await this.loadLogs();
    } catch (error) {
      console.error('加载数据失败', error);
    } finally {
      this.setData({ loading: false });
    }
  },

  // 加载积分记录
  loadLogs: async function () {
    const { page, pageSize } = this.data;

    try {
      const result = await pointsApi.getLogs({ page, limit: pageSize });

      const logs = (result.list || []).map(item => ({
        ...item,
        formattedTime: formatDate(item.created_at, 'MM-DD HH:mm'),
        typeText: this.getTypeText(item.type)
      }));

      this.setData({
        logs: page === 1 ? logs : [...this.data.logs, ...logs],
        hasMore: logs.length >= pageSize
      });
    } catch (error) {
      console.error('加载积分记录失败', error);
    }
  },

  // 加载更多
  loadMoreLogs: async function () {
    this.setData({
      loadingMore: true,
      page: this.data.page + 1
    });

    try {
      await this.loadLogs();
    } finally {
      this.setData({ loadingMore: false });
    }
  },

  // 跳转到积分榜
  goToRank: function () {
    wx.navigateTo({
      url: '/pages/points-rank/points-rank'
    });
  },

  // 获取类型文本
  getTypeText: function (type) {
    const typeMap = {
      activity: '活动签到',
      exchange: '兑换商品',
      admin: '管理员调整'
    };
    return typeMap[type] || type;
  }
});