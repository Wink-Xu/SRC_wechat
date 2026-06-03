// pages/about-story/about-story.js
const { adminApi } = require('../../utils/request');

Page({
  data: {
    runnerYearsImages: []
  },

  onLoad: function () {
    this.loadRunnerYears();
  },

  loadRunnerYears: async function () {
    try {
      const result = await adminApi.getHomeContent({});
      if (result && result.runnerYears && result.runnerYears.images) {
        this.setData({ runnerYearsImages: result.runnerYears.images });
      }
    } catch (error) {
      console.error('加载跑者岁月图片失败', error);
    }
  },

  previewRunnerYearsImage: function (e) {
    const index = e.currentTarget.dataset.index;
    wx.previewImage({
      current: this.data.runnerYearsImages[index],
      urls: this.data.runnerYearsImages
    });
  },

  previewCover: function () {
    wx.previewImage({
      current: '/images/fengmianpic.jpg',
      urls: ['/images/fengmianpic.jpg']
    });
  }
});
