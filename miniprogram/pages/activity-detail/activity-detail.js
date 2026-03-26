// pages/activity-detail/activity-detail.js
const { activityApi } = require('../../utils/request');
const { formatDate, showConfirm, showSuccess, showInfo } = require('../../utils/util');
const { isAdmin } = require('../../utils/auth');

Page({
  data: {
    id: '',
    activity: null,
    loading: true,
    isRegistered: false,
    registration: null,
    participants: [],
    runTypeText: '',
    canUploadPhotos: false,
    isMember: false,
    registrationClosed: false,
    // 批量删除照片
    isSelectMode: false,
    selectedPhotos: []
  },

  onLoad: function (options) {
    if (options.id) {
      this.setData({ id: options.id });
      this.loadActivity();
    }
  },

  // 加载活动详情
  loadActivity: async function () {
    this.setData({ loading: true });

    try {
      const result = await activityApi.getDetail({ id: this.data.id });
      const activity = result.activity;

      // 格式化时间
      activity.formattedTime = formatDate(activity.start_time, 'MM 月 DD 日 HH:mm');
      activity.formattedEndTime = formatDate(activity.end_time, 'HH:mm');
      activity.statusText = this.getStatusText(activity.status);
      activity.statusClass = this.getStatusClass(activity.status);

      // 格式化报名截止时间（精确到分钟）
      if (activity.registration_deadline) {
        activity.formattedRegistrationDeadline = formatDate(activity.registration_deadline, 'MM 月 DD 日 HH:mm');
      }

      // 检查报名是否已截止
      let registrationClosed = false;
      if (activity.registration_deadline) {
        const deadline = new Date(activity.registration_deadline);
        const now = new Date();
        registrationClosed = now > deadline;
      }

      // 跑步类型文本
      const runTypeMap = {
        road: '路跑',
        trail: '越野跑',
        hiking: '徒步',
        brand: '品牌合作跑'
      };
      const runTypeText = runTypeMap[activity.run_type] || '路跑';

      // 检查用户状态
      const app = getApp();
      const userInfo = app.globalData.userInfo;
      const isMember = userInfo && userInfo.status === 'approved';
      const canUploadPhotos = userInfo && (userInfo.role === 'admin' || userInfo.role === 'leader');

      // 处理照片：将 fileID 转换为临时 URL（解决体验用户看不到照片的问题）
      let displayPhotos = activity.photos || [];
      if (displayPhotos.length > 0 && displayPhotos[0].startsWith('cloud://')) {
        try {
          const tempUrlResult = await wx.cloud.getTempFileURL({
            fileList: displayPhotos
          });
          // 使用临时 URL 显示照片
          displayPhotos = tempUrlResult.fileList.map(file => file.tempFileURL || file.fileID);
        } catch (photoErr) {
          console.error('获取照片临时链接失败', photoErr);
          // 如果获取失败，继续使用 fileID
          displayPhotos = activity.photos;
        }
      }

      // 处理封面图
      let displayCoverImage = activity.cover_image;
      if (displayCoverImage && displayCoverImage.startsWith('cloud://')) {
        try {
          const coverUrlResult = await wx.cloud.getTempFileURL({
            fileList: [displayCoverImage]
          });
          displayCoverImage = coverUrlResult.fileList[0]?.tempURL || displayCoverImage;
        } catch (coverErr) {
          console.error('获取封面临时链接失败', coverErr);
        }
      }

      this.setData({
        activity: { ...activity, photos: displayPhotos, cover_image: displayCoverImage },
        isRegistered: result.isRegistered,
        registration: result.registration,
        participants: result.participants || [],
        runTypeText,
        canUploadPhotos,
        isMember,
        registrationClosed,
        loading: false,
        isSelectMode: false,
        selectedPhotos: []
      });

      wx.setNavigationBarTitle({
        title: activity.title
      });
    } catch (error) {
      console.error('加载活动详情失败', error);
      this.setData({ loading: false });
    }
  },

  // 报名活动
  handleRegister: async function () {
    const app = getApp();

    // 检查是否登录
    if (!app.globalData.isLoggedIn) {
      wx.showModal({
        title: '请先登录',
        content: '请前往"我的"页面进行登录',
        showCancel: false,
        success: () => {
          wx.switchTab({
            url: '/pages/profile/profile'
          });
        }
      });
      return;
    }

    // 检查是否是团员（已批准）
    if (app.globalData.userInfo.status !== 'approved') {
      if (app.globalData.userInfo.status === 'pending') {
        wx.showToast({
          title: '您的申请正在审核中，请耐心等待',
          icon: 'none'
        });
      } else {
        // 游客状态，引导去申请
        wx.showModal({
          title: '提示',
          content: '您还不是团员，是否立即申请入团？',
          success: (res) => {
            if (res.confirm) {
              wx.navigateTo({ url: '/pages/apply-membership/apply-membership' });
            }
          }
        });
      }
      return;
    }

    const confirm = await showConfirm('确认报名', '确定要报名参加此活动吗？');
    if (!confirm) return;

    try {
      await activityApi.register({ activityId: this.data.id });
      showSuccess('报名成功');
      this.loadActivity();
    } catch (error) {
      console.error('报名失败', error);
    }
  },

  // 取消报名
  handleCancelRegistration: async function () {
    const confirm = await showConfirm('取消报名', '确定要取消报名吗？');
    if (!confirm) return;

    try {
      await activityApi.cancelRegistration({ activityId: this.data.id });
      showSuccess('已取消报名');
      this.loadActivity();
    } catch (error) {
      console.error('取消报名失败', error);
    }
  },

  // 上传照片
  uploadPhotos: async function () {
    const self = this;
    try {
      const chooseRes = await new Promise((resolve, reject) => {
        wx.chooseMedia({
          count: 9,
          mediaType: ['image'],
          sourceType: ['album', 'camera'],
          sizeType: ['compressed'],
          success: resolve,
          fail: reject
        });
      });

      const tempFiles = chooseRes.tempFiles;
      if (!tempFiles || tempFiles.length === 0) return;

      wx.showLoading({ title: '上传中...' });

      // 上传照片到云存储
      const uploadPromises = tempFiles.map(file => {
        return new Promise((resolve, reject) => {
          const cloudPath = `activity_photos/${self.data.id}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
          wx.cloud.uploadFile({
            cloudPath: cloudPath,
            filePath: file.tempFilePath,
            isPrivate: false,
            success: res => resolve(res.fileID),
            fail: reject
          });
        });
      });

      const fileIDs = await Promise.all(uploadPromises);

      // 调用云函数更新照片列表
      await activityApi.updatePhotos({
        id: self.data.id,
        photos: fileIDs
      });

      wx.hideLoading();
      wx.showToast({ title: '上传成功', icon: 'success' });

      // 重新加载活动详情
      self.loadActivity();
    } catch (err) {
      wx.hideLoading();
      console.error('上传照片失败', err);
      wx.showToast({ title: '上传失败', icon: 'none' });
    }
  },

  // 预览照片
  previewImage: function (e) {
    const index = e.currentTarget.dataset.index;
    const photos = this.data.activity.photos || [];

    wx.previewImage({
      current: photos[index],
      urls: photos
    });
  },

  // 删除照片
  deletePhoto: async function (e) {
    const index = e.currentTarget.dataset.index;
    const photos = this.data.activity.photos || [];

    const confirm = await showConfirm('删除照片', '确定要删除这张照片吗？');
    if (!confirm) return;

    try {
      const newPhotos = [...photos];
      newPhotos.splice(index, 1);

      await activityApi.updatePhotos({
        id: this.data.id,
        photos: newPhotos
      });

      showSuccess('已删除');
      this.loadActivity();
    } catch (error) {
      console.error('删除照片失败', error);
      wx.showToast({ title: '删除失败', icon: 'none' });
    }
  },

  // 进入选择模式
  enterSelectMode: function () {
    this.setData({
      isSelectMode: true,
      selectedPhotos: []
    });
  },

  // 取消选择模式
  cancelSelectMode: function () {
    this.setData({
      isSelectMode: false,
      selectedPhotos: []
    });
  },

  // 切换选择照片
  toggleSelectPhoto: function (e) {
    const index = e.currentTarget.dataset.index;
    const selectedPhotos = [...this.data.selectedPhotos];
    const idx = selectedPhotos.indexOf(index);

    if (idx > -1) {
      selectedPhotos.splice(idx, 1);
    } else {
      selectedPhotos.push(index);
    }

    this.setData({ selectedPhotos });
  },

  // 全选
  selectAll: function () {
    const photos = this.data.activity.photos || [];
    const allIndexes = photos.map((_, index) => index);
    this.setData({ selectedPhotos: allIndexes });
  },

  // 批量删除选中的照片
  deleteSelectedPhotos: async function () {
    const { selectedPhotos, activity } = this.data;
    const photos = activity.photos || [];

    if (selectedPhotos.length === 0) return;

    const confirm = await showConfirm('删除照片', `确定要删除选中的 ${selectedPhotos.length} 张照片吗？`);
    if (!confirm) return;

    try {
      // 按索引从大到小排序，避免删除时索引变化
      const sortedIndexes = [...selectedPhotos].sort((a, b) => b - a);
      const newPhotos = [...photos];

      sortedIndexes.forEach(index => {
        newPhotos.splice(index, 1);
      });

      await activityApi.updatePhotos({
        id: this.data.id,
        photos: newPhotos
      });

      showSuccess(`已删除 ${selectedPhotos.length} 张照片`);
      this.setData({
        isSelectMode: false,
        selectedPhotos: []
      });
      this.loadActivity();
    } catch (error) {
      console.error('批量删除照片失败', error);
      wx.showToast({ title: '删除失败', icon: 'none' });
    }
  },

  // 更换封面图
  changeCoverImage: async function () {
    const self = this;
    try {
      const chooseRes = await new Promise((resolve, reject) => {
        wx.chooseMedia({
          count: 1,
          mediaType: ['image'],
          sourceType: ['album', 'camera'],
          sizeType: ['original'],
          success: resolve,
          fail: reject
        });
      });

      const tempFile = chooseRes.tempFiles[0];
      if (!tempFile) return;

      // 显示封面调整器
      self.adjuster = self.selectComponent('#coverAdjuster');
      self.adjuster.show(tempFile.tempFilePath);
      self.tempCoverSrc = tempFile.tempFilePath;
    } catch (err) {
      console.error('选择图片失败', err);
    }
  },

  // 封面调整确认
  onCoverConfirm: async function (e) {
    const self = this;
    const { tempFilePath } = e.detail;

    wx.showLoading({ title: '上传中...' });

    try {
      // 上传封面图到云存储
      const cloudPath = `activity_covers/${self.data.id}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
      const uploadRes = await new Promise((resolve, reject) => {
        wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: tempFilePath,
          isPrivate: false,
          success: resolve,
          fail: reject
        });
      });

      // 调用云函数更新封面
      await activityApi.updateCoverImage({
        id: self.data.id,
        coverImage: uploadRes.fileID
      });

      wx.hideLoading();
      showSuccess('更换成功');

      // 重新加载活动详情
      self.loadActivity();
    } catch (err) {
      wx.hideLoading();
      console.error('更换封面失败', err);
      wx.showToast({ title: '更换失败', icon: 'none' });
    }
  },

  // 封面调整取消
  onCoverCancel: function () {
    // 用户取消
  },

  // 查看报名名单
  viewParticipants: function () {
    wx.navigateTo({
      url: `/pages/activity-participants/activity-participants?id=${this.data.id}`
    });
  },

  // 去申请入团
  goToApply: function () {
    wx.navigateTo({
      url: '/pages/apply-membership/apply-membership'
    });
  },

  // 打开地图查看地点
  openLocation: function () {
    const activity = this.data.activity;
    if (!activity || !activity.location) {
      wx.showToast({
        title: '暂无地点信息',
        icon: 'none'
      });
      return;
    }

    // 如果有经纬度，直接定位
    if (activity.latitude && activity.longitude) {
      wx.openLocation({
        latitude: activity.latitude,
        longitude: activity.longitude,
        name: activity.location,
        scale: 16
      });
    } else {
      // 没有经纬度，打开地图让用户搜索
      wx.openLocation({
        latitude: 30.5728,  // 武汉默认坐标
        longitude: 114.2793,
        name: activity.location,
        address: activity.location,
        scale: 16
      });
    }
  },

  // 扫码签到
  scanToCheckIn: function () {
    const self = this;
    wx.scanCode({
      success: function (res) {
        console.log('扫码结果:', res);

        let activityId = null;

        // 尝试解析扫码结果
        if (res.result) {
          try {
            const qrData = JSON.parse(res.result);
            if (qrData.type === 'checkin' && qrData.activity_id) {
              activityId = qrData.activity_id;
            }
          } catch (e) {
            // 可能是小程序码，result 是活动 ID
            activityId = res.result;
          }
        }

        if (!activityId) {
          wx.showToast({
            title: '无效的签到码',
            icon: 'none'
          });
          return;
        }

        // 验证是否是当前活动
        if (activityId !== self.data.id) {
          wx.showToast({
            title: '这不是当前活动的签到码',
            icon: 'none'
          });
          return;
        }

        // 执行签到
        self.doSelfCheckIn();
      },
      fail: function (err) {
        console.error('扫码失败', err);
      }
    });
  },

  // 执行自助签到
  doSelfCheckIn: async function () {
    wx.showLoading({ title: '签到中...' });

    try {
      const result = await activityApi.selfCheckIn({ activityId: this.data.id });
      wx.hideLoading();

      wx.showModal({
        title: '签到成功',
        content: `签到成功！活动结束后将获得 ${result.points} 积分`,
        showCancel: false,
        success: () => {
          this.loadActivity();
        }
      });
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error?.message || '签到失败',
        icon: 'none'
      });
    }
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
