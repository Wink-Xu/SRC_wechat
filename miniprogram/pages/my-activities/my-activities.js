// pages/my-activities/my-activities.js
const { activityApi } = require('../../utils/request');
const { formatDate } = require('../../utils/util');
const app = getApp();

Page({
  data: {
    checkedInActivities: [],
    loading: true
  },

  onLoad: function () {
    this.loadActivities();
  },

  onShow: function () {
    this.loadActivities();
  },

  loadActivities: async function () {
    this.setData({ loading: true });

    try {
      // 获取所有活动
      const result = await activityApi.getList({ status: 'all' });
      const activities = result.list || [];

      // 获取当前用户的报名记录
      const userId = app.globalData.userInfo?._id;
      if (!userId) {
        this.setData({ checkedInActivities: [], loading: false });
        return;
      }

      // 筛选出已签到的活动
      let checkedInActivities = activities.filter(activity => {
        // 检查是否有报名记录且已签到
        const registrations = activity.participants || [];
        const userRegistration = registrations.find(r => r.user_id === userId);
        return userRegistration && userRegistration.check_in_status === 'checked_in';
      });

      // 收集需要转换的封面图 fileID
      const coverImageFileIDs = checkedInActivities
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
      checkedInActivities = checkedInActivities.map(activity => {
        const formatted = {
          ...activity,
          formattedTime: formatDate(activity.start_time, 'YYYY 年 MM 月 DD 日')
        };
        // 转换封面图
        if (activity.cover_image && activity.cover_image.startsWith('cloud://') && tempUrlMap[activity.cover_image]) {
          formatted.display_cover_image = tempUrlMap[activity.cover_image];
        }
        return formatted;
      });

      this.setData({
        checkedInActivities,
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
