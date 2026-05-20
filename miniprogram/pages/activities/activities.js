// pages/activities/activities.js
const { activityApi } = require('../../utils/request');
const { formatDate } = require('../../utils/util');
const { imageUrlCache, setCache, getCache } = require('../../utils/cache');

Page({
  data: {
    ongoingActivities: [],  // 正在报名的活动
    pastActivities: [],     // 往期活动
    loading: true,
    loadingMore: false,
    hasMore: true,
    page: 1,
    pageSize: 10,
    hasLoaded: false,
  },

  onLoad: function () {
    this.loadActivities();
  },

  onShow: function () {
    // 每次显示时后台静默刷新，确保新创建的活动出现在列表中
    if (this.data.hasLoaded) {
      this.refreshActivitiesData(this.data.page, this.data.pageSize, true);
      return;
    }
    this.loadActivities();
  },

  onPullDownRefresh: function () {
    this.refreshActivities().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom: function () {
    if (this.data.hasMore && !this.data.loadingMore) {
      this.loadMoreActivities();
    }
  },

  // 刷新活动列表
  refreshActivities: async function () {
    this.setData({
      page: 1,
      hasMore: true,
      ongoingActivities: [],
      pastActivities: []
    });
    return this.loadActivities();
  },

  // 加载活动列表
  loadActivities: async function () {
    this.setData({ loading: true });

    try {
      const { page, pageSize } = this.data;

      // 尝试从缓存读取数据（仅第一页）
      if (page === 1) {
        const cachedData = getCache('activities_list');
        if (cachedData) {
          this.setData({
            ongoingActivities: cachedData.ongoingActivities || [],
            pastActivities: cachedData.pastActivities || [],
            loading: false
          });
          // 后台静默刷新数据
          this.refreshActivitiesData(page, pageSize, true);
          return;
        }
      }

      await this.refreshActivitiesData(page, pageSize, false);
    } catch (error) {
      console.error('加载活动列表失败', error);
      this.setData({ loading: false });
    }
  },

  // 刷新活动数据（优化：单次请求获取所有状态）
  refreshActivitiesData: async function (page, pageSize, isBackgroundRefresh) {
    // 优化：单次请求替代原来的 2 次并行请求
    const result = await activityApi.getListOptimized({
      page,
      limit: pageSize
    });

    const allActivities = [...(result.ongoingList || []), ...(result.endedList || [])];

    // 收集所有需要转换的封面图 fileID
    const coverImageFileIDs = allActivities
      .filter(item => item.cover_image && item.cover_image.startsWith('cloud://'))
      .map(item => item.cover_image);

    // 批量转换 fileID 为临时 URL（优先从缓存获取）
    let tempUrlMap = {};
    const uncachedFileIDs = [];

    coverImageFileIDs.forEach(fileID => {
      const cachedUrl = imageUrlCache.get(fileID);
      if (cachedUrl) {
        tempUrlMap[fileID] = cachedUrl;
      } else {
        uncachedFileIDs.push(fileID);
      }
    });

    // 仅对未缓存的 fileID 请求临时 URL
    if (uncachedFileIDs.length > 0) {
      try {
        const tempUrlResult = await wx.cloud.getTempFileURL({
          fileList: uncachedFileIDs
        });
        const newUrls = {};
        tempUrlResult.fileList.forEach(file => {
          if (file.status === 0 && file.tempFileURL) {
            tempUrlMap[file.fileID] = file.tempFileURL;
            newUrls[file.fileID] = file.tempFileURL;
          }
        });
        imageUrlCache.setBatch(newUrls);
      } catch (err) {
        console.error('获取封面临时链接失败', err);
      }
    }

    // 处理正在报名的活动（过滤已隐藏的）
    const ongoingActivities = (result.ongoingList || [])
      .filter(item => !item.hidden)
      .map(item => this.formatActivity(item, tempUrlMap));

    // 处理往期活动（过滤已隐藏的）
    const pastActivities = (result.endedList || [])
      .filter(item => !item.hidden)
      .map(item => this.formatActivity(item, tempUrlMap));

    // 缓存第一页数据
    if (page === 1) {
      setCache('activities_list', { ongoingActivities, pastActivities }, 5 * 60 * 1000);
      wx.setStorageSync('activities_last_load_time', Date.now());
    }

    this.setData({
      ongoingActivities: page === 1 ? ongoingActivities : [...this.data.ongoingActivities, ...ongoingActivities],
      pastActivities: page === 1 ? pastActivities : [...this.data.pastActivities, ...pastActivities],
      hasMore: ongoingActivities.length >= pageSize || pastActivities.length >= pageSize,
      loading: false,
      hasLoaded: true
    });

    // 预加载下一页（非首次加载时才预加载，避免抢占首屏带宽）
    if (!isBackgroundRefresh && !this._preloadOnFirstLoad) {
      this._preloadOnFirstLoad = true;
      this.preloadNextPage();
    }
  },

  // 格式化活动数据
  formatActivity: function(item, tempUrlMap) {
    const runTypeMap = {
      road: '路跑',
      trail: '越野跑',
      hiking: '徒步',
      brand: '品牌合作跑'
    };

    // 计算周期性活动文字
    let recurringText = '';
    if (item.is_recurring && item.repeat_days && item.repeat_days.length > 0) {
      const dayNames = { 1: '周一', 2: '周二', 3: '周三', 4: '周四', 5: '周五', 6: '周六', 7: '周日' };
      const days = item.repeat_days.map(d => dayNames[d] || '').filter(Boolean);
      if (days.length === 7) {
        recurringText = '每天';
      } else {
        recurringText = '每' + days.join('');
      }
    } else if (item.is_recurring) {
      recurringText = '周期性';
    }

    const formatted = {
      ...item,
      formattedTime: formatDate(item.start_time, 'MM 月 DD 日 HH:mm'),
      statusText: this.getStatusText(item.status),
      statusClass: this.getStatusClass(item.status),
      runTypeText: runTypeMap[item.run_type] || '',
      recurringText
    };

    // 转换封面图 fileID 为临时 URL
    if (item.cover_image && item.cover_image.startsWith('cloud://') && tempUrlMap[item.cover_image]) {
      formatted.display_cover_image = tempUrlMap[item.cover_image];
    } else if (item.cover_image && !item.cover_image.startsWith('cloud://')) {
      formatted.display_cover_image = item.cover_image;
    }

    // 格式化报名截止时间
    if (item.registration_deadline) {
      var deadlineDate = item.registration_deadline instanceof Date ? item.registration_deadline : new Date(item.registration_deadline);
      formatted.registration_deadline = formatDate(deadlineDate, 'MM-DD HH:mm');
    }

    return formatted;
  },

  // 加载更多
  loadMoreActivities: async function () {
    // 如果有预加载数据，直接使用
    if (this._preloadedData && this._preloadedPage === this.data.page + 1) {
      this.setData({
        loadingMore: true,
        page: this.data.page + 1
      });

      const { result } = this._preloadedData;
      this._preloadedData = null;

      const allActivities = [...(result.ongoingList || []), ...(result.endedList || [])];
      const coverImageFileIDs = allActivities
        .filter(item => item.cover_image && item.cover_image.startsWith('cloud://'))
        .map(item => item.cover_image);

      let tempUrlMap = {};
      const uncachedFileIDs = [];
      coverImageFileIDs.forEach(fileID => {
        const cachedUrl = imageUrlCache.get(fileID);
        if (cachedUrl) {
          tempUrlMap[fileID] = cachedUrl;
        } else {
          uncachedFileIDs.push(fileID);
        }
      });

      if (uncachedFileIDs.length > 0) {
        try {
          const tempUrlResult = await wx.cloud.getTempFileURL({ fileList: uncachedFileIDs });
          const newUrls = {};
          tempUrlResult.fileList.forEach(file => {
            if (file.status === 0 && file.tempFileURL) {
              tempUrlMap[file.fileID] = file.tempFileURL;
              newUrls[file.fileID] = file.tempFileURL;
            }
          });
          imageUrlCache.setBatch(newUrls);
        } catch (err) {
          console.error('获取封面临时链接失败', err);
        }
      }

      const ongoingActivities = (result.ongoingList || []).filter(item => !item.hidden).map(item => this.formatActivity(item, tempUrlMap));
      const pastActivities = (result.endedList || []).filter(item => !item.hidden).map(item => this.formatActivity(item, tempUrlMap));

      this.setData({
        ongoingActivities: [...this.data.ongoingActivities, ...ongoingActivities],
        pastActivities: [...this.data.pastActivities, ...pastActivities],
        hasMore: ongoingActivities.length >= this.data.pageSize || pastActivities.length >= this.data.pageSize,
        loadingMore: false
      });

      // 预加载下一页
      this.preloadNextPage();
      return;
    }

    this.setData({
      loadingMore: true,
      page: this.data.page + 1
    });

    try {
      await this.refreshActivitiesData(this.data.page, this.data.pageSize, false);
    } finally {
      this.setData({ loadingMore: false });
    }
  },

  // 预加载下一页
  preloadNextPage: function () {
    if (this.data.hasMore && !this.data.loadingMore && !this._preloading) {
      this._preloading = true;
      this._preloadedPage = this.data.page + 1;

      const self = this;
      activityApi.getListOptimized({
        page: this._preloadedPage,
        limit: this.data.pageSize
      }).then(function(result) {
        self._preloadedData = { result };
        self._preloading = false;
      }).catch(function() {
        self._preloading = false;
      });
    }
  },

  // 切换选项卡
  onTabChange: function (e) {
    const { key } = e.currentTarget.dataset;
    this.setData({
      currentTab: key,
      activities: [],
      page: 1,
      hasMore: true
    });
    this.loadActivities();
  },

  // 跳转到活动详情
  goToDetail: function (e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/activity-detail/activity-detail?id=${id}`
    });
  },

  // 获取状态文本
  getStatusText: function (status) {
    const statusMap = {
      draft: '草稿',
      ongoing: '进行中',
      ended: '已结束',
      cancelled: '已取消'
    };
    return statusMap[status] || status;
  },

  // 获取状态样式类
  getStatusClass: function (status) {
    const classMap = {
      draft: 'tag-warning',
      ongoing: 'tag-success',
      ended: 'tag-secondary',
      cancelled: 'tag-error'
    };
    return classMap[status] || '';
  }
});
