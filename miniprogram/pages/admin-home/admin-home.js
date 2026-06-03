// pages/admin-home/admin-home.js
const { adminApi } = require('../../utils/request');
const { showSuccess, showInfo } = require('../../utils/util');
const { isAdmin } = require('../../utils/auth');

Page({
  data: {
    loading: true,
    saving: false,
    // 公告
    announcement: {
      text: '',
      image: ''
    },
    announcementTempImage: '',
    // 那些一起奔跑的岁月
    runnerYearsImages: [],
    runnerYearsTempImages: []
  },

  onLoad: function () {
    if (!isAdmin()) {
      wx.navigateBack();
      return;
    }
    this.loadContent();
  },

  loadContent: async function () {
    this.setData({ loading: true });
    try {
      const result = await adminApi.getHomeContent({});
      if (result) {
        if (result.announcement) {
          this.setData({
            'announcement.text': result.announcement.text || '',
            'announcement.image': result.announcement.image || ''
          });
        }
        // 跑者岁月图片
        if (result.runnerYears && result.runnerYears.images) {
          this.setData({ runnerYearsImages: result.runnerYears.images });
        }
      }
    } catch (error) {
      console.error('加载首页内容失败', error);
    } finally {
      this.setData({ loading: false });
    }
  },

  // ===== 公告编辑 =====
  onAnnouncementTextInput: function (e) {
    this.setData({ 'announcement.text': e.detail.value });
  },

  chooseAnnouncementImage: function () {
    const that = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        const tempFilePath = res.tempFilePaths[0];
        that.setData({ announcementTempImage: tempFilePath });
      }
    });
  },

  removeAnnouncementImage: function () {
    this.setData({
      'announcement.image': '',
      announcementTempImage: ''
    });
  },

  // ===== 上传并保存 =====
  uploadImage: async function (tempFilePath, prefix) {
    const ext = tempFilePath.match(/\.(\w+)$/)?.[1] || 'jpg';
    const cloudPath = `home_content/${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;
    const uploadResult = await wx.cloud.uploadFile({
      cloudPath,
      filePath: tempFilePath,
      isPrivate: false
    });
    return uploadResult.fileID;
  },

  saveAnnouncement: async function () {
    if (this.data.saving) return;
    this.setData({ saving: true });

    try {
      let image = this.data.announcement.image;

      // 上传新图片
      if (this.data.announcementTempImage) {
        image = await this.uploadImage(this.data.announcementTempImage, 'announcement');
      }

      await adminApi.saveHomeContent({
        type: 'announcement',
        text: this.data.announcement.text,
        image
      });

      this.setData({
        'announcement.image': image,
        announcementTempImage: ''
      });

      showSuccess('公告保存成功');
    } catch (error) {
      console.error('保存公告失败', error);
      const msg = error && error.message ? error.message : '保存失败，请重试';
      showInfo(msg);
    } finally {
      this.setData({ saving: false });
    }
  },

  // ===== 跑者岁月图片 =====
  chooseRunnerYearsImage: function () {
    const that = this;
    wx.chooseImage({
      count: 9,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        const newTempImages = res.tempFilePaths || [];
        that.setData({
          runnerYearsTempImages: that.data.runnerYearsTempImages.concat(newTempImages)
        });
      }
    });
  },

  removeRunnerYearsImage: function (e) {
    const index = e.currentTarget.dataset.index;
    const images = [...this.data.runnerYearsImages];
    images.splice(index, 1);
    this.setData({ runnerYearsImages: images });
  },

  saveRunnerYears: async function () {
    if (this.data.saving) return;
    this.setData({ saving: true });

    try {
      let images = [...this.data.runnerYearsImages];

      // 上传新图片
      const tempImages = this.data.runnerYearsTempImages;
      if (tempImages.length > 0) {
        const uploadPromises = tempImages.map(tempPath =>
          this.uploadImage(tempPath, 'runner_years')
        );
        const newFileIDs = await Promise.all(uploadPromises);
        images = images.concat(newFileIDs);
      }

      await adminApi.saveHomeContent({
        type: 'runner_years',
        images
      });

      this.setData({
        runnerYearsImages: images,
        runnerYearsTempImages: []
      });

      showSuccess('图片保存成功');
    } catch (error) {
      console.error('保存跑者岁月图片失败', error);
      const msg = error && error.message ? error.message : '保存失败，请重试';
      showInfo(msg);
    } finally {
      this.setData({ saving: false });
    }
  },

});
