// pages/home/home.js
const { adminApi, activityApi } = require('../../utils/request');

function formatToday() {
  const d = new Date();
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const day = days[d.getDay()];
  const month = d.getMonth() + 1;
  const date = d.getDate();
  return `${day}，${month}月${date}日`;
}

Page({
  data: {
    loaded: false,
    today: formatToday(),
    announcementCards: [],
    highlightCards: [],
    aboutImage: '',
    navBarTop: 0
  },

  onLoad: function () {
    this.initNavBar();
    this.loadContent();
    this.loadPastHighlights();
  },

  onShow: function () {
    this.loadContent();
    this.loadPastHighlights();
  },

  initNavBar: function () {
    const sys = wx.getSystemInfoSync();
    this.setData({ navBarTop: sys.statusBarHeight + 18 });
  },

  loadContent: async function () {
    try {
      const result = await adminApi.getHomeContent({});
      if (result) {
        // 公告卡片
        const cards = [];
        if (result.announcement) {
          cards.push({
            image: result.announcement.image || '/images/logo.jpg',
            title: result.announcement.text || ''
          });
        }
        this.setData({ announcementCards: cards });

        // 关于我们 — 单张封面图
        if (result.aboutUs && result.aboutUs.images && result.aboutUs.images.length > 0) {
          this.setData({ aboutImage: result.aboutUs.images[0] });
        } else {
          this.setData({ aboutImage: '/images/logo.jpg' });
        }
      }
    } catch (error) {
      console.error('加载首页内容失败', error);
    } finally {
      this.setData({ loaded: true });
    }
  },

  loadPastHighlights: async function () {
    try {
      const res = await activityApi.getList({ highlight: true, limit: 3, page: 1 });
      if (res && res.list) {
        const cards = res.list
          .filter(a => a.cover_image || a.display_cover_image)
          .map(a => ({
            image: a.display_cover_image || a.cover_image,
            activityId: a._id,
            title: a.title
          }));
        this.setData({ highlightCards: cards });
      }
    } catch (error) {
      console.error('加载往期精彩失败', error);
    }
  },

  goToActivity: function (e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/activity-detail/activity-detail?id=' + id });
  },

  goToAboutUs: function () {
    wx.navigateTo({ url: '/pages/about-us/about-us' });
  },

  previewAnnouncementImage: function () {
    if (this.data.announcementCards.length > 0) {
      wx.previewImage({ urls: [this.data.announcementCards[0].image] });
    }
  }
});
