// pages/home/home.js
Page({
  data: {
    showAnnouncements: true,
    showAbout: false,
    showContact: false
  },

  onLoad: function () {
    // 从云函数获取公告内容（可选）
  },

  onToggleAnnouncements: function () {
    this.setData({ showAnnouncements: !this.data.showAnnouncements });
  },

  onToggleAbout: function () {
    this.setData({ showAbout: !this.data.showAbout });
  },

  onToggleContact: function () {
    this.setData({ showContact: !this.data.showContact });
  }
});
