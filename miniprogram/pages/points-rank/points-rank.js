// pages/points-rank/points-rank.js
const { pointsApi } = require('../../utils/request');

Page({
  data: {
    ranking: [],
    loading: true,
    myRank: null
  },

  onLoad: function () {
    this.loadRanking();
  },

  onPullDownRefresh: function () {
    this.loadRanking().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 加载排行榜
  loadRanking: async function () {
    try {
      const result = await pointsApi.getRanking();

      // 收集需要转换的头像 fileID
      const rawRanking = result.list || [];
      const avatarFileIDs = rawRanking
        .filter(item => item.avatar && item.avatar.startsWith('cloud://'))
        .map(item => item.avatar);

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

      // 格式化并转换头像
      const ranking = rawRanking.map((item, index) => {
        const processed = {
          ...item,
          rank: index + 1
        };
        if (item.avatar && item.avatar.startsWith('cloud://') && tempUrlMap[item.avatar]) {
          processed.displayAvatar = tempUrlMap[item.avatar];
        }
        return processed;
      });

      this.setData({
        ranking,
        myRank: result.myRank,
        loading: false
      });
    } catch (error) {
      console.error('加载排行榜失败', error);
      this.setData({ loading: false });
    }
  }
});