// pages/activity-create/activity-create.js
const { activityApi } = require('../../utils/request');
const { formatDate, showSuccess, showInfo } = require('../../utils/util');
const { requireAdmin } = require('../../utils/auth');
const app = getApp();

Page({
  data: {
    id: '', // 编辑时使用
    isEdit: false,
    formData: {
      title: '',
      description: '',
      location: '',
      latitude: null,
      longitude: null,
      run_type: 'road', // road | trail | hiking | brand
      dress_code: '',
      start_datetime: '', // ISO 格式
      start_datetime_display: '',
      start_date: '', // 保留用于提交
      start_time: '', // 保留用于提交
      registration_deadline: '', // ISO 格式
      registration_deadline_display: '',
      registration_deadline_date: '', // 保留用于提交
      registration_deadline_time: '', // 保留用于提交
      quota: 20,
      points: 10,
      cover_image: ''
    },
    runTypes: [
      { value: 'road', label: '路跑' },
      { value: 'trail', label: '越野跑' },
      { value: 'hiking', label: '徒步' },
      { value: 'brand', label: '品牌合作跑' }
    ],
    minDate: new Date().toISOString().split('T')[0]
  },

  onLoad: function (options) {
    if (!requireAdmin()) {
      wx.navigateBack();
      return;
    }

    if (options.id) {
      this.setData({ id: options.id, isEdit: true });
      this.loadActivity(options.id);
    }
  },

  // 加载活动数据
  loadActivity: async function (id) {
    try {
      const result = await activityApi.getDetail({ id });
      const activity = result.activity;

      // 解析日期时间
      let startDate = '';
      let startTime = '';
      let startDatetime = '';
      let startDatetimeDisplay = '';
      if (activity.start_time) {
        const startDateTime = activity.start_time instanceof Date ? activity.start_time : new Date(activity.start_time);
        startDate = formatDate(startDateTime, 'YYYY-MM-DD');
        startTime = formatDate(startDateTime, 'HH:mm');
        startDatetime = startDateTime.toISOString();
        startDatetimeDisplay = `${startDate} ${startTime}`;
      }

      let registrationDeadline = '';
      let registrationDeadlineDisplay = '';
      let registrationDeadlineDate = '';
      let registrationDeadlineTime = '';
      if (activity.registration_deadline) {
        const deadlineDate = activity.registration_deadline instanceof Date ? activity.registration_deadline : new Date(activity.registration_deadline);
        registrationDeadlineDate = formatDate(deadlineDate, 'YYYY-MM-DD');
        registrationDeadlineTime = formatDate(deadlineDate, 'HH:mm');
        registrationDeadline = deadlineDate.toISOString();
        registrationDeadlineDisplay = `${registrationDeadlineDate} ${registrationDeadlineTime}`;
      }

      this.setData({
        formData: {
          title: activity.title,
          description: activity.description || '',
          location: activity.location,
          latitude: activity.latitude || null,
          longitude: activity.longitude || null,
          run_type: activity.run_type || 'road',
          dress_code: activity.dress_code || '',
          start_datetime: startDatetime,
          start_datetime_display: startDatetimeDisplay,
          start_date: startDate,
          start_time: startTime,
          registration_deadline: registrationDeadline,
          registration_deadline_display: registrationDeadlineDisplay,
          registration_deadline_date: registrationDeadlineDate,
          registration_deadline_time: registrationDeadlineTime,
          quota: activity.quota,
          points: activity.points,
          cover_image: activity.cover_image || ''
        }
      });
    } catch (error) {
      console.error('加载活动失败', error);
    }
  },

  // 输入标题
  onTitleInput: function (e) {
    this.setData({ 'formData.title': e.detail.value });
  },

  // 输入描述
  onDescInput: function (e) {
    this.setData({ 'formData.description': e.detail.value });
  },

  // 输入地点
  onLocationInput: function (e) {
    this.setData({ 'formData.location': e.detail.value });
  },

  // 选择地图位置
  chooseLocation: function () {
    const that = this;
    wx.chooseLocation({
      success: function (res) {
        // res.name: 位置名称
        // res.address: 详细地址
        // res.latitude: 纬度
        // res.longitude: 经度
        that.setData({
          'formData.location': res.name || res.address,
          'formData.latitude': res.latitude,
          'formData.longitude': res.longitude
        });
      },
      fail: function (err) {
        console.error('选择位置失败', err);
      }
    });
  },

  // 选择跑步类型
  onRunTypeChange: function (e) {
    const { value } = e.currentTarget.dataset;
    this.setData({ 'formData.run_type': value });
  },

  // 输入 Dress Code
  onDressCodeInput: function (e) {
    this.setData({ 'formData.dress_code': e.detail.value });
  },

  // 选择活动时间（日期时间选择器）
  onStartDatetimeChange: function (e) {
    const { value, displayValue } = e.detail;
    const date = new Date(value);
    const startDate = formatDate(date, 'YYYY-MM-DD');
    const startTime = formatDate(date, 'HH:mm');

    this.setData({
      'formData.start_datetime': value,
      'formData.start_datetime_display': displayValue,
      'formData.start_date': startDate,
      'formData.start_time': startTime
    });
  },

  // 选择报名截止时间（日期时间选择器）
  onRegistrationDeadlineChange: function (e) {
    const { value, displayValue } = e.detail;
    const date = new Date(value);
    const deadlineDate = formatDate(date, 'YYYY-MM-DD');
    const deadlineTime = formatDate(date, 'HH:mm');

    this.setData({
      'formData.registration_deadline': value,
      'formData.registration_deadline_display': displayValue,
      'formData.registration_deadline_date': deadlineDate,
      'formData.registration_deadline_time': deadlineTime
    });
  },

  // 选择报名截止日期
  onRegistrationDeadlineChangeOld: function (e) {
    this.setData({ 'formData.registration_deadline_date': e.detail.value });
  },

  // 选择报名截止时间
  onRegistrationDeadlineTimeChange: function (e) {
    this.setData({ 'formData.registration_deadline_time': e.detail.value });
  },

  // 输入名额
  onQuotaInput: function (e) {
    this.setData({ 'formData.quota': parseInt(e.detail.value) || 0 });
  },

  // 输入积分
  onPointsInput: function (e) {
    this.setData({ 'formData.points': parseInt(e.detail.value) || 0 });
  },

  // 选择封面图
  chooseImage: function () {
    const that = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['original'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        const tempFilePath = res.tempFilePaths[0];
        // 显示调整器
        that.adjuster = that.selectComponent('#coverAdjuster');
        that.adjuster.show(tempFilePath);
        that.tempImageSrc = tempFilePath;
      },
      fail: function (err) {
        console.error('选择图片失败', err);
      }
    });
  },

  // 封面调整确认
  onCoverConfirm: function (e) {
    const that = this;
    const { tempFilePath } = e.detail;

    wx.showLoading({ title: '上传中...' });

    wx.cloud.uploadFile({
      cloudPath: `activity_covers/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`,
      filePath: tempFilePath,
      isPrivate: false,
      success: function (uploadRes) {
        wx.hideLoading();
        that.setData({
          'formData.cover_image': uploadRes.fileID
        });
        showSuccess('封面上传成功');
      },
      fail: function (uploadErr) {
        wx.hideLoading();
        console.error('上传图片失败', uploadErr);
        wx.showToast({ title: '上传失败', icon: 'none' });
      }
    });
  },

  // 封面调整取消
  onCoverCancel: function () {
    // 用户取消
  },

  // 删除封面图
  removeImage: function () {
    this.setData({
      'formData.cover_image': ''
    });
  },

  // 提交表单
  handleSubmit: async function () {
    const { formData, isEdit, id } = this.data;

    // 验证表单
    if (!formData.cover_image) {
      showInfo('请上传封面图');
      return;
    }
    if (!formData.title.trim()) {
      showInfo('请输入活动标题');
      return;
    }
    if (!formData.description.trim()) {
      showInfo('请输入活动描述');
      return;
    }
    if (!formData.location.trim()) {
      showInfo('请输入集合地点');
      return;
    }
    if (!formData.run_type) {
      showInfo('请选择跑步类型');
      return;
    }
    if (!formData.dress_code.trim()) {
      showInfo('请输入 Dress Code');
      return;
    }
    if (!formData.start_datetime) {
      showInfo('请选择活动时间');
      return;
    }
    if (formData.quota <= 0) {
      showInfo('名额必须大于 0');
      return;
    }
    if (formData.points <= 0) {
      showInfo('积分必须大于 0');
      return;
    }

    // 构建提交数据
    const submitData = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      location: formData.location.trim(),
      latitude: formData.latitude,
      longitude: formData.longitude,
      run_type: formData.run_type,
      dress_code: formData.dress_code.trim(),
      start_time: `${formData.start_date} ${formData.start_time}`,
      quota: formData.quota,
      points: formData.points,
      cover_image: formData.cover_image
    };

    // 报名截止时间（可选）
    if (formData.registration_deadline) {
      submitData.registration_deadline = `${formData.registration_deadline_date} ${formData.registration_deadline_time}`;
    }

    try {
      if (isEdit) {
        await activityApi.update({ id, ...submitData });
        showSuccess('保存成功');
      } else {
        await activityApi.create(submitData);
        showSuccess('创建成功');
      }

      setTimeout(() => {
        wx.navigateBack({
          delta: 1
        });
      }, 1500);
    } catch (error) {
      console.error('提交失败', error);
      showInfo('提交失败，请重试');
    }
  }
});
