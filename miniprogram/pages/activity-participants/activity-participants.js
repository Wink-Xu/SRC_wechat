// pages/activity-participants/activity-participants.js
const { activityApi } = require('../../utils/request');

Page({
  data: {
    id: '',
    activity: null,
    participants: [],
    loading: true
  },

  onLoad: function (options) {
    if (options.id) {
      this.setData({ id: options.id });
      this.loadParticipants();
    }
  },

  // 加载报名名单
  loadParticipants: async function () {
    this.setData({ loading: true });

    try {
      const result = await activityApi.getDetail({ id: this.data.id });

      // 收集需要转换的头像 fileID
      const participants = result.participants || [];
      const avatarFileIDs = participants
        .filter(p => p.avatar && p.avatar.startsWith('cloud://'))
        .map(p => p.avatar);

      // 批量转换 fileID 为临时 URL
      let tempUrlMap = {};
      if (avatarFileIDs.length > 0) {
        try {
          const tempUrlResult = await wx.cloud.getTempFileURL({
            fileList: avatarFileIDs
          });
          tempUrlResult.fileList.forEach(file => {
            tempUrlMap[file.fileID] = file.tempFileURL;
          });
        } catch (err) {
          console.error('获取头像临时链接失败', err);
        }
      }

      // 转换头像
      const processedParticipants = participants.map(p => {
        if (p.avatar && p.avatar.startsWith('cloud://') && tempUrlMap[p.avatar]) {
          return { ...p, displayAvatar: tempUrlMap[p.avatar] };
        }
        return p;
      });

      this.setData({
        activity: result.activity,
        participants: processedParticipants,
        loading: false
      });

      wx.setNavigationBarTitle({
        title: `报名名单 (${this.data.participants.length}人)`
      });
    } catch (error) {
      console.error('加载报名名单失败', error);
      this.setData({ loading: false });
    }
  }
});
