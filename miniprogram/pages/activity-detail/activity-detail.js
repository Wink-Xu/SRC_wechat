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
    // 签到相关
    showCheckInQr: false,      // 是否显示签到码弹窗
    checkInQrCode: '',         // 签到码图片数据
    checkInCount: 0,           // 已签到人数
    isAdminOrLeader: false     // 是否管理员或团长
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

      // 格式化报名截止时间
      if (activity.registration_deadline) {
        activity.registration_deadline = formatDate(activity.registration_deadline, 'YYYY-MM-DD');
      }

      // 跑步类型文本
      const runTypeMap = {
        road: '路跑',
        trail: '越野跑',
        hiking: '徒步',
        brand: '品牌合作跑'
      };
      const runTypeText = runTypeMap[activity.run_type] || '路跑';

      // 检查是否可以上传照片（管理员或团长）
      const app = getApp();
      const canUploadPhotos = app.globalData.userInfo &&
        (app.globalData.userInfo.role === 'admin' || app.globalData.userInfo.role === 'leader');

      // 检查是否是管理员或团长
      const isAdminOrLeader = app.globalData.userInfo &&
        (app.globalData.userInfo.role === 'admin' || app.globalData.userInfo.role === 'leader');

      this.setData({
        activity,
        isRegistered: result.isRegistered,
        registration: result.registration,
        participants: result.participants || [],
        runTypeText,
        canUploadPhotos,
        isAdminOrLeader,
        checkInCount: activity.check_in_count || 0,
        loading: false
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
      wx.navigateTo({ url: '/pages/login/login' });
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

          // 模拟上传成功
          setTimeout(function () {
            wx.hideLoading();
            const newPhotos = tempFiles.map(function (file) {
              return file.tempFilePath;
            });
            const currentPhotos = self.data.activity.photos || [];
            const updatedPhotos = currentPhotos.concat(newPhotos);

            self.setData({
              'activity.photos': updatedPhotos
            });

            wx.showToast({ title: '上传成功', icon: 'success' });
          }, 1000);
        }
      },
      fail: function (err) {
        console.error('选择照片失败', err);
      }
    });
  },

  // 显示签到码
  showCheckInQrCode: async function () {
    try {
      const result = await activityApi.getCheckInQrCode({ id: this.data.id });
      this.setData({
        checkInQrCode: result.qr_code,
        checkInCount: result.check_in_count || 0,
        showCheckInQr: true
      });
    } catch (error) {
      console.error('获取签到码失败', error);
      wx.showToast({
        title: '获取签到码失败',
        icon: 'none'
      });
    }
  },

  // 关闭签到码弹窗
  closeCheckInQrCode: function () {
    this.setData({
      showCheckInQr: false
    });
  },

  // 保存二维码图片
  saveQrCode: function () {
    const that = this;
    wx.showLoading({ title: '保存中...' });

    // 下载图片并保存
    wx.downloadFile({
      url: this.data.checkInQrCode,
      success: function (res) {
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: function () {
            wx.hideLoading();
            wx.showToast({
              title: '保存成功',
              icon: 'success'
            });
          },
          fail: function (err) {
            wx.hideLoading();
            if (err.errMsg.includes('auth deny')) {
              wx.showModal({
                title: '提示',
                content: '您已拒绝相册权限，请在设置中开启',
                confirmText: '去设置',
                success: function (modalRes) {
                  if (modalRes.confirm) {
                    wx.openSetting();
                  }
                }
              });
            } else {
              wx.showToast({
                title: '保存失败',
                icon: 'none'
              });
            }
          }
        });
      },
      fail: function (err) {
        wx.hideLoading();
        wx.showToast({
          title: '下载图片失败',
          icon: 'none'
        });
        console.error('下载图片失败', err);
      }
    });
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

  // 查看报名名单
  viewParticipants: function () {
    wx.navigateTo({
      url: `/pages/activity-participants/activity-participants?id=${this.data.id}`
    });
  },

  // 获取状态文本
  getStatusText: function (status) {
    const statusMap = {
      draft: '草稿',
      published: '报名中',
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
      published: 'tag-primary',
      ongoing: 'tag-success',
      ended: 'tag-secondary',
      cancelled: 'tag-error'
    };
    return classMap[status] || '';
  }
});
