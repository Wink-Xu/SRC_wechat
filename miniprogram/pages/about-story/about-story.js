// pages/about-story/about-story.js
const { adminApi } = require('../../utils/request');

Page({
  data: {
    runnerYearsImages: [],
    coverImage: ''
  },

  onLoad: function () {
    this.loadRunnerYears();
  },

  loadRunnerYears: async function () {
    try {
      const result = await adminApi.getHomeContent({});
      if (result && result.runnerYears) {
        const setData = {};
        if (result.runnerYears.images) {
          setData.runnerYearsImages = result.runnerYears.images;
        }
        if (result.runnerYears.cover_image) {
          setData.coverImage = result.runnerYears.cover_image;
        }
        this.setData(setData);
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
    const cover = this.data.coverImage || '/images/fengmianpic.jpg';
    wx.previewImage({
      current: cover,
      urls: [cover]
    });
  }
});
