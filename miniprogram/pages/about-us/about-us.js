// pages/about-us/about-us.js
const { adminApi } = require('../../utils/request');

Page({
  data: {
    text: '',
    images: []
  },

  onLoad: function () {
    this.loadContent();
  },

  loadContent: async function () {
    try {
      const result = await adminApi.getHomeContent({});
      if (result && result.aboutUs) {
        const images = result.aboutUs.images || [];
        this.setData({
          text: result.aboutUs.text || '',
          images
        });
        if (images.length > 0) {
          this.processImages(images);
        }
      }
    } catch (error) {
      console.error('加载关于我们失败', error);
    }
  },

  processImages: async function (images) {
    const cloudFileIDs = images.filter(img => img.startsWith('cloud://'));
    if (cloudFileIDs.length === 0) {
      this.setData({ images });
      return;
    }
    try {
      const tempUrlResult = await wx.cloud.getTempFileURL({ fileList: cloudFileIDs });
      const tempUrls = {};
      tempUrlResult.fileList.forEach(file => {
        if (file.status === 0 && file.tempFileURL) {
          tempUrls[file.fileID] = file.tempFileURL;
        }
      });
      this.setData({ images: images.map(img => tempUrls[img] || img) });
    } catch (err) {
      console.error('获取图片临时链接失败', err);
    }
  },

  previewImage: function (e) {
    const index = e.currentTarget.dataset.index;
    wx.previewImage({ current: this.data.images[index], urls: this.data.images });
  }
});
