// pages/about-story/about-story.js
const { adminApi } = require('../../utils/request');

const STORY_TEXT = `我们出生武汉，名为星期天跑步俱乐部，
Sunday 作为时间的刻度，是约定俗成的默契。
我们包容彼此的同时探索奔跑的美学！

武汉的咖啡店和过早铺全都留下过我们的足迹，
Sunday 的浪漫藏在跑后咖啡的香味里，在
跑步时滴落的汗水里，在看过的日出和踏过的树影里，在山野的泥土与落叶里。
樱花下落的速度，风吹过的温度，都被我们用跑步记录。

SRC 始于跑步，但不止于跑步。
我们也把跑步的热情变成了打开世界和打开自我的勇气。
对另一种陌生城市的探索，一起爬过陡峭的山脊，一起徒步过绝美的的高地…
每一次出发都是一群人的冒险！

跑步从来不是一个人的事。Sunday，既是时间的标尺，也是我们在一起的理由：
它让我们彼此依靠，在汗水里长出信任，在成长中互相滋养。
以跑步为纽带，以凝聚为土壤，我们跑得更远，也跑进了彼此的生活！

故事还在继续，跑步也不会停止…`;

Page({
  data: {
    storyParagraphs: [],
    runnerYearsImages: [],
    coverImage: ''
  },

  onLoad: function () {
    // 按空行分割段落
    this.setData({
      storyParagraphs: STORY_TEXT.split('\n\n').filter(p => p.trim())
    });
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
