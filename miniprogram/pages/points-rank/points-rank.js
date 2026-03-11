// pages/points-rank/points-rank.js
const { pointsApi } = require('../../utils/request');

Page({
  data: {
    ranking: [],
    loading: true,
    myRank: null
  },

  onLoad: function () {
    this.loadRanking();
  },

  onPullDownRefresh: function () {
    this.loadRanking().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 加载排行榜
  loadRanking: async function () {
    try {
      const result = await pointsApi.getRanking();

      const ranking = (result.list || []).map((item, index) => ({
        ...item,
        rank: index + 1
      }));

      this.setData({
        ranking,
        myRank: result.myRank,
        loading: false
      });
    } catch (error) {
      console.error('加载排行榜失败', error);
      this.setData({ loading: false });
    }
  }
});