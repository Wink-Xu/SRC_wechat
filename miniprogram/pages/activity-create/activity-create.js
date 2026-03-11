// pages/activity-create/activity-create.js
const { activityApi } = require('../../utils/request');
const { formatDate, showSuccess, showInfo } = require('../../utils/util');
const { requireAdmin } = require('../../utils/auth');

Page({
  data: {
    id: '', // 编辑时使用
    isEdit: false,
    formData: {
      title: '',
      description: '',
      location: '',
      run_type: 'road', // road | trail | hiking | brand
      dress_code: '',
      start_date: '',
      start_time: '',
      end_time: '',
      registration_deadline_date: '',
      registration_deadline_time: '',
      quota: 20,
      points: 10
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
      let endTime = '';
      if (activity.start_time) {
        const startDateTime = activity.start_time instanceof Date ? activity.start_time : new Date(activity.start_time);
        startDate = formatDate(startDateTime, 'YYYY-MM-DD');
        startTime = formatDate(startDateTime, 'HH:mm');
      }
      if (activity.end_time) {
        const endDateTime = activity.end_time instanceof Date ? activity.end_time : new Date(activity.end_time);
        endTime = formatDate(endDateTime, 'HH:mm');
      }

      let registrationDeadlineDate = '';
      let registrationDeadlineTime = '';
      if (activity.registration_deadline) {
        const deadlineDate = activity.registration_deadline instanceof Date ? activity.registration_deadline : new Date(activity.registration_deadline);
        registrationDeadlineDate = formatDate(deadlineDate, 'YYYY-MM-DD');
        registrationDeadlineTime = formatDate(deadlineDate, 'HH:mm');
      }

      this.setData({
        formData: {
          title: activity.title,
          description: activity.description || '',
          location: activity.location,
          run_type: activity.run_type || 'road',
          dress_code: activity.dress_code || '',
          start_date: startDate,
          start_time: startTime,
          end_time: endTime,
          registration_deadline_date: registrationDeadlineDate,
          registration_deadline_time: registrationDeadlineTime,
          quota: activity.quota,
          points: activity.points
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

  // 选择跑步类型
  onRunTypeChange: function (e) {
    const { value } = e.currentTarget.dataset;
    this.setData({ 'formData.run_type': value });
  },

  // 输入 Dress Code
  onDressCodeInput: function (e) {
    this.setData({ 'formData.dress_code': e.detail.value });
  },

  // 选择活动日期
  onDateChange: function (e) {
    this.setData({ 'formData.start_date': e.detail.value });
  },

  // 选择开始时间
  onStartTimeChange: function (e) {
    this.setData({ 'formData.start_time': e.detail.value });
  },

  // 选择结束时间
  onEndTimeChange: function (e) {
    this.setData({ 'formData.end_time': e.detail.value });
  },

  // 选择报名截止日期
  onRegistrationDeadlineChange: function (e) {
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

  // 提交表单
  handleSubmit: async function () {
    const { formData, isEdit, id } = this.data;

    // 验证表单
    if (!formData.title.trim()) {
      showInfo('请输入活动标题');
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
    if (!formData.start_date) {
      showInfo('请选择活动日期');
      return;
    }
    if (!formData.start_time) {
      showInfo('请选择开始时间');
      return;
    }
    if (!formData.end_time) {
      showInfo('请选择结束时间');
      return;
    }
    if (!formData.registration_deadline_date) {
      showInfo('请选择报名截止日期');
      return;
    }
    if (!formData.registration_deadline_time) {
      showInfo('请选择报名截止时间');
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
      run_type: formData.run_type,
      dress_code: formData.dress_code.trim(),
      start_time: `${formData.start_date} ${formData.start_time}`,
      end_time: `${formData.start_date} ${formData.end_time}`,
      registration_deadline: `${formData.registration_deadline_date} ${formData.registration_deadline_time}`,
      quota: formData.quota,
      points: formData.points
    };

    try {
      if (isEdit) {
        await activityApi.update({ id, ...submitData });
        showSuccess('保存成功');
      } else {
        await activityApi.create(submitData);
        showSuccess('创建成功，返回列表');
      }

      setTimeout(() => {
        // 返回列表页，并传递刷新标志
        wx.navigateBack({
          delta: 1,
          events: {
            refresh: function() {
              console.log('列表已刷新');
            }
          }
        });
      }, 1500);
    } catch (error) {
      console.error('提交失败', error);
      showInfo('提交失败，请重试');
    }
  }
});
