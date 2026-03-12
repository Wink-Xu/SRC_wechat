// pages/activity-approval/activity-approval.js
const { activityApi } = require('../../utils/request');
const { showSuccess, showError } = require('../../utils/util');

Page({
  data: {
    id: '',
    activity: null,
    participants: [],
    photos: [],
    loading: true,
    selectedCount: 0
  },

  onLoad: function (options) {
    if (options.id) {
      this.setData({ id: options.id });
      this.loadParticipants();
    }
  },

  // 加载参加人员
  loadParticipants: async function () {
    this.setData({ loading: true });

    try {
      const result = await activityApi.getDetail({ id: this.data.id });
      const activity = result.activity;

      // 格式化时间
      const { formatDate } = require('../../utils/util');
      activity.formattedTime = formatDate(activity.start_time, 'MM 月 DD 日 HH:mm');

      // 初始化参与者选择状态
      const participants = (result.participants || []).map(item => ({
        ...item,
        selected: false
      }));

      this.setData({
        activity,
        participants,
        loading: false
      });

      wx.setNavigationBarTitle({
        title: `活动审批 (${participants.length}人)`
      });
    } catch (error) {
      console.error('加载参加人员失败', error);
      this.setData({ loading: false });
    }
  },

  // 切换选择状态
  toggleParticipant: function (e) {
    const index = e.currentTarget.dataset.index;
    const key = `participants[${index}].selected`;
    const current = this.data.participants[index].selected;

    this.setData({
      [key]: !current
    });

    this.updateSelectedCount();
  },

  // 全选
  selectAll: function () {
    const participants = this.data.participants.map(item => ({
      ...item,
      selected: true
    }));

    this.setData({ participants });
    this.updateSelectedCount();
  },

  // 全不选
  deselectAll: function () {
    const participants = this.data.participants.map(item => ({
      ...item,
      selected: false
    }));

    this.setData({ participants });
    this.updateSelectedCount();
  },

  // 更新选中人数
  updateSelectedCount: function () {
    const count = this.data.participants.filter(item => item.selected).length;
    this.setData({ selectedCount: count });
  },

  // 上传照片
  uploadPhotos: function () {
    const self = this;
    wx.chooseMedia({
      count: 9,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: function (res) {
        const tempFiles = res.tempFiles;
        if (tempFiles && tempFiles.length > 0) {
          wx.showLoading({ title: '上传中...' });

          // 模拟上传
          setTimeout(function () {
            wx.hideLoading();
            const newPhotos = tempFiles.map(file => file.tempFilePath);
            const currentPhotos = self.data.photos || [];

            self.setData({
              photos: currentPhotos.concat(newPhotos)
            });

            showSuccess('上传成功');
          }, 1000);
        }
      },
      fail: function (err) {
        console.error('选择照片失败', err);
      }
    });
  },

  // 取消
  cancel: function () {
    wx.navigateBack();
  },

  // 提交审批
  submitApproval: function () {
    const self = this;
    const selectedParticipants = this.data.participants.filter(item => item.selected);

    wx.showModal({
      title: '确认提交',
      content: `确认 ${selectedParticipants.length} 人参加活动，将为每人发放 ${this.data.activity.points} 积分。是否继续？`,
      success: function (res) {
        if (res.confirm) {
          // TODO: 调用 API 提交审批
          // 1. 更新活动状态为 ended
          // 2. 为选中的 participant 发放积分
          // 3. 保存活动照片

          showSuccess('审批完成');

          // 返回活动详情页
          setTimeout(function () {
            wx.navigateBack();
          }, 1500);
        }
      }
    });
  }
});
