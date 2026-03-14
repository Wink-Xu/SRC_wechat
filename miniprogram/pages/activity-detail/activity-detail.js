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

  // 扫码签到
  handleCheckIn: function () {
    const that = this;

    wx.scanCode({
      success: function (res) {
        console.log('扫码结果:', res);

        // 解析二维码内容，期望格式：{ type: 'checkin', activity_id: 'xxx' }
        let qrData;
        try {
          qrData = JSON.parse(res.result);
        } catch (e) {
          // 兼容纯文本二维码（只有 activity_id）
          qrData = { type: 'checkin', activity_id: res.result };
        }

        if (qrData.type !== 'checkin' || !qrData.activity_id) {
          wx.showToast({
            title: '无效的签到码',
            icon: 'none'
          });
          return;
        }

        if (qrData.activity_id !== that.data.id) {
          wx.showToast({
            title: '此码不属于当前活动',
            icon: 'none'
          });
          return;
        }

        // 确认签到
        wx.showModal({
          title: '确认签到',
          content: `确认参加"${that.data.activity.title}"？`,
          success: function (modalRes) {
            if (modalRes.confirm) {
              that.confirmCheckIn(qrData.activity_id);
            }
          }
        });
      },
      fail: function (err) {
        console.error('扫码失败', err);
        if (err.errMsg.includes('cancel')) {
          // 用户取消扫码，不做提示
        } else {
          wx.showToast({
            title: '扫码失败，请重试',
            icon: 'none'
          });
        }
      }
    });
  },

  // 确认签到
  confirmCheckIn: async function (activityId) {
    try {
      await activityApi.checkIn({ activityId });
      wx.showToast({
        title: '签到成功',
        icon: 'success'
      });
      // 刷新活动详情，更新签到状态
      this.loadActivity();
    } catch (error) {
      console.error('签到失败', error);
      wx.showToast({
        title: error?.message || '签到失败，请重试',
        icon: 'none'
      });
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
