// pages/my-activities/my-activities.js
const { activityApi } = require('../../utils/request');
const { formatDate } = require('../../utils/util');
const app = getApp();

Page({
  data: {
    checkedInActivities: [],
    registeredActivities: [],
    currentTab: 'all',
    loading: true
  },

  onLoad: function () {
    this.loadActivities();
  },

  onShow: function () {
    this.loadActivities();
  },

  // 切换 Tab
  switchTab: function (e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tab });
  },

  loadActivities: async function () {
    this.setData({ loading: true });

    try {
      // 获取已报名的活动（包含 registered 和 checked_in）
      const result = await activityApi.getList({ registered: true });
      const activities = result.list || [];

      // 区分已签到和未签到
      const checkedInActivities = activities.filter(a => a.user_checked_in);
      const registeredActivities = activities.filter(a => !a.user_checked_in);

      // 收集需要转换的封面图 fileID
      const coverImageFileIDs = activities
        .filter(item => item.cover_image && item.cover_image.startsWith('cloud://'))
        .map(item => item.cover_image);

      // 批量转换 fileID 为临时 URL
      let tempUrlMap = {};
      if (coverImageFileIDs.length > 0) {
        try {
          const tempUrlResult = await wx.cloud.getTempFileURL({
            fileList: coverImageFileIDs
          });
          tempUrlResult.fileList.forEach(file => {
            tempUrlMap[file.fileID] = file.tempFileURL;
          });
        } catch (err) {
          console.error('获取封面临时链接失败', err);
        }
      }

      // 格式化并转换图片
      const formatItem = activity => {
        const formatted = {
          ...activity,
          formattedTime: formatDate(activity.start_time, 'YYYY 年 MM 月 DD 日'),
          isCheckedIn: !!activity.user_checked_in
        };
        if (activity.cover_image && activity.cover_image.startsWith('cloud://') && tempUrlMap[activity.cover_image]) {
          formatted.display_cover_image = tempUrlMap[activity.cover_image];
        }
        return formatted;
      };

      this.setData({
        checkedInActivities: checkedInActivities.map(formatItem),
        registeredActivities: registeredActivities.map(formatItem),
        loading: false
      });
    } catch (error) {
      console.error('加载我的活动失败', error);
      this.setData({ loading: false });
    }
  },

  goToDetail: function (e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/activity-detail/activity-detail?id=${id}`
    });
  }
});
