// pages/home/home.js
Page({
  data: {
    showAnnouncements: true,
    showAbout: false,
    showContact: false
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
