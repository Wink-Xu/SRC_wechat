// pages/activity-create/activity-create.js
const { activityApi } = require('../../utils/request');
const { formatDate, showSuccess, showInfo } = require('../../utils/util');
const { requireAdmin } = require('../../utils/auth');
const app = getApp();

const DRAFT_KEY = 'activity_create_draft';

Page({
  data: {
    submitting: false,
    id: '', // 编辑时使用
    isEdit: false,
    formData: {
      title: '',
      description: '',
      location: '',
      latitude: null,
      longitude: null,
      run_type: '',
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
      cover_image: '',
      // 报名设置
      member_only: false,      // 是否仅团员报名
      registration_fee_type: '', // '' | 'points' | 'cash'
      registration_fee: 0,       // 报名费用
      registration_fee_yuan: '',  // 现金显示用（元）
      refund_policy: 'anytime',   // 退款政策: anytime | half
      // 重复设置
      is_recurring: false
    },
    // 星期选择（独立字段，避免嵌套数组渲染问题）
    isRecurring: false,
    repeatMon: false,
    repeatTue: false,
    repeatWed: false,
    repeatThu: false,
    repeatFri: false,
    repeatSat: false,
    repeatSun: false,
    runTypes: [],
    runTypeIndex: 0,
    runTypeLabel: '无限制',
    minDate: new Date().toISOString().split('T')[0],
    // 弹窗控制
    showPointsInputModal: false,
    showCashInputModal: false,
    showDescModal: false,
    tempDescValue: '',
    tempFeeValue: ''
  },

  onLoad: function (options) {
    if (!requireAdmin()) {
      wx.navigateBack();
      return;
    }

    if (options.id) {
      this.setData({ id: options.id, isEdit: true });
      this.loadActivity(options.id);
      return;
    }

    // 检查草稿
    const draft = this.checkDraft();
    if (draft) {
      const that = this;
      wx.showModal({
        title: '恢复草稿',
        content: '检测到上次未提交的草稿，是否恢复？',
        cancelText: '丢弃',
        confirmText: '恢复',
        success (res) {
          if (res.confirm) {
            that.setData({ formData: draft });
            that.updateRunTypeDisplay(draft.run_type || '');
            if (draft.repeat_days && draft.repeat_days.length > 0) {
              that.setRepeatDays(draft.repeat_days);
            }
            if (draft.is_recurring) {
              that.setData({ isRecurring: true });
            }
          } else {
            that.clearDraft();
          }
        }
      });
    }
  },

  // 自动保存草稿（仅在新建时）
  autoSaveDraft: function () {
    if (this.data.isEdit) return;
    const { formData } = this.data;
    try {
      wx.setStorageSync(DRAFT_KEY, JSON.stringify(formData));
    } catch (e) {
      // 存储满时忽略
    }
  },

  // 检测草稿
  checkDraft: function () {
    try {
      const draft = wx.getStorageSync(DRAFT_KEY);
      return draft ? JSON.parse(draft) : null;
    } catch (e) {
      return null;
    }
  },

  // 清除草稿
  clearDraft: function () {
    try {
      wx.removeStorageSync(DRAFT_KEY);
    } catch (e) {
      // ignore
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
          cover_image: activity.cover_image || '',
          // 报名设置
          member_only: activity.member_only || false,
          registration_fee_type: activity.registration_fee_type || '',
          registration_fee: activity.registration_fee || 0,
          registration_fee_yuan: activity.registration_fee_type === 'cash' && activity.registration_fee
            ? (activity.registration_fee / 100).toFixed(2)
            : '',
          refund_policy: activity.refund_policy || 'anytime',
          // 重复设置
          is_recurring: activity.is_recurring || false
        }
      });

      // 恢复星期勾选
      this.setData({ isRecurring: activity.is_recurring || false });
      if (activity.repeat_days && activity.repeat_days.length > 0) {
        this.setRepeatDays(activity.repeat_days);
      }
    } catch (error) {
      console.error('加载活动失败', error);
    }
  },

  // 输入标题
  onTitleInput: function (e) {
    this.setData({ 'formData.title': e.detail.value });
    this.autoSaveDraft();
  },

  // 输入描述
  onDescInput: function (e) {
    this.setData({ 'formData.description': e.detail.value });
    this.autoSaveDraft();
  },

  // 打开全屏描述编辑器
  openDescEditor: function () {
    this.setData({
      showDescModal: true,
      tempDescValue: this.data.formData.description
    });
  },

  // 描述编辑器输入
  onTempDescInput: function (e) {
    this.setData({ tempDescValue: e.detail.value });
  },

  // 确认描述
  confirmDesc: function () {
    this.setData({
      'formData.description': this.data.tempDescValue,
      showDescModal: false
    });
    this.autoSaveDraft();
  },

  // 取消描述编辑
  cancelDesc: function () {
    this.setData({
      showDescModal: false,
      tempDescValue: ''
    });
  },

  // 输入地点
  onLocationInput: function (e) {
    this.setData({ 'formData.location': e.detail.value });
    this.autoSaveDraft();
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
        that.autoSaveDraft();
      },
      fail: function (err) {
        console.error('选择位置失败', err);
      }
    });
  },

  // 更新跑步类型显示
  updateRunTypeDisplay: function (runType) {
  },

  // 输入 Dress Code
  onDressCodeInput: function (e) {
    this.setData({ 'formData.dress_code': e.detail.value });
    this.autoSaveDraft();
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
    this.autoSaveDraft();
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
    this.autoSaveDraft();
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
    this.autoSaveDraft();
  },

  // 输入积分
  onPointsInput: function (e) {
    this.setData({ 'formData.points': parseInt(e.detail.value) || 0 });
    this.autoSaveDraft();
  },

  // 切换仅团员报名
  onMemberOnlyChange: function (e) {
    this.setData({ 'formData.member_only': e.detail.value });
    this.autoSaveDraft();
  },

  // 切换重复举办
  onRecurringChange: function (e) {
    this.setData({
      isRecurring: e.detail.value,
      'formData.is_recurring': e.detail.value
    });
    this.autoSaveDraft();
  },

  // 切换重复日期
  onDayToggle: function (e) {
    const day = e.currentTarget.dataset.day;
    const key = 'repeat' + day.charAt(0).toUpperCase() + day.slice(1);
    this.setData({ [key]: !this.data[key] });
    this.autoSaveDraft();
  },

  // 获取选中的日期数字（1=周一 ... 7=周日）
  getRepeatDays: function () {
    const map = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 7 };
    const days = [];
    for (const [key, num] of Object.entries(map)) {
      if (this.data['repeat' + key.charAt(0).toUpperCase() + key.slice(1)]) {
        days.push(num);
      }
    }
    return days.sort();
  },

  // 根据日期数字设置星期勾选
  setRepeatDays: function (days) {
    const map = { 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat', 7: 'sun' };
    const update = {};
    for (const [dayNum, key] of Object.entries(map)) {
      update['repeat' + key.charAt(0).toUpperCase() + key.slice(1)] = days.includes(parseInt(dayNum));
    }
    this.setData(update);
  },

  // 切换报名费用类型
  // 切换免费
  onFeeTypeChange: function (e) {
    const { value } = e.currentTarget.dataset;
    this.setData({
      'formData.registration_fee_type': value,
      'formData.registration_fee': 0
    });
    this.autoSaveDraft();
  },

  // 切换退款政策
  onRefundPolicyChange: function (e) {
    const { value } = e.currentTarget.dataset;
    this.setData({ 'formData.refund_policy': value });
    this.autoSaveDraft();
  },

  // 显示积分输入弹窗
  showPointsModal: function () {
    this.setData({
      showPointsInputModal: true,
      tempFeeValue: this.data.formData.registration_fee_type === 'points' ? String(this.data.formData.registration_fee) : ''
    });
  },

  // 显示现金输入弹窗
  showCashModal: function () {
    const currentValue = this.data.formData.registration_fee_type === 'cash' && this.data.formData.registration_fee
      ? (this.data.formData.registration_fee / 100).toFixed(2)
      : '';
    this.setData({
      showCashInputModal: true,
      tempFeeValue: currentValue
    });
  },

  // 关闭弹窗
  closeFeeModal: function () {
    this.setData({
      showPointsInputModal: false,
      showCashInputModal: false,
      tempFeeValue: ''
    });
  },

  // 临时金额输入
  onTempFeeInput: function (e) {
    this.setData({ tempFeeValue: e.detail.value });
  },

  // 确认积分
  confirmPointsFee: function () {
    const fee = parseInt(this.data.tempFeeValue) || 0;
    if (fee <= 0) {
      showInfo('请输入有效的积分数量');
      return;
    }
    this.setData({
      'formData.registration_fee_type': 'points',
      'formData.registration_fee': fee,
      showPointsInputModal: false,
      tempFeeValue: ''
    });
    this.autoSaveDraft();
  },

  // 确认现金
  confirmCashFee: function () {
    const fee = parseFloat(this.data.tempFeeValue) || 0;
    if (fee <= 0) {
      showInfo('请输入有效的金额');
      return;
    }
    // 转换为分存储
    this.setData({
      'formData.registration_fee_type': 'cash',
      'formData.registration_fee': Math.round(fee * 100),
      'formData.registration_fee_yuan': fee.toFixed(2),
      showCashInputModal: false,
      tempFeeValue: ''
    });
    this.autoSaveDraft();
  },

  // 输入报名费用
  
  // 选择封面图
  chooseImage: function () {
    const that = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['original'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        const tempFilePath = res.tempFilePaths[0];
        // 直接上传原图，保留原始比例
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
            that.autoSaveDraft();
            showSuccess('封面上传成功');
          },
          fail: function (uploadErr) {
            wx.hideLoading();
            console.error('上传图片失败', uploadErr);
            wx.showToast({ title: '上传失败', icon: 'none' });
          }
        });
      },
      fail: function (err) {
        console.error('选择图片失败', err);
      }
    });
  },

  // 删除封面图
  removeImage: function () {
    this.setData({
      'formData.cover_image': ''
    });
    this.autoSaveDraft();
  },

  // 提交表单
  handleSubmit: async function () {
    try {
      if (this.data.submitting || this._submitting) return;

      const { formData, isEdit, id } = this.data;
      if (!formData) {
        wx.showModal({ title: '提示', content: '表单数据异常，请重试', showCancel: false });
        return;
      }

      // 先验证，通过后再设置提交状态
      if (!formData.cover_image) {
        wx.showModal({ title: '提示', content: '封面图没有上传', showCancel: false });
        return;
      }
      if (!formData.title || !formData.title.trim()) {
        wx.showModal({ title: '提示', content: '活动标题没有填写', showCancel: false });
        return;
      }
      if (!formData.description || !formData.description.trim()) {
        wx.showModal({ title: '提示', content: '活动描述没有填写', showCancel: false });
        return;
      }
      if (!formData.location || !formData.location.trim()) {
        wx.showModal({ title: '提示', content: '集合地点没有填写', showCancel: false });
        return;
      }
      if (!formData.dress_code || !formData.dress_code.trim()) {
        wx.showModal({ title: '提示', content: 'Dress Code 没有填写', showCancel: false });
        return;
      }
      if (!formData.start_datetime) {
        wx.showModal({ title: '提示', content: '请选择活动时间', showCancel: false });
        return;
      }
      if (formData.quota <= 0) {
        wx.showModal({ title: '提示', content: '名额必须大于 0', showCancel: false });
        return;
      }
      if (formData.points < 0) {
        wx.showModal({ title: '提示', content: '积分不能为负数', showCancel: false });
        return;
      }

      // 重复活动必须选择至少一个日期
      if (formData.is_recurring && this.getRepeatDays().length === 0) {
        wx.showModal({ title: '提示', content: '请至少选择一个重复日期', showCancel: false });
        return;
      }

      this._submitting = true;
      this.setData({ submitting: true });

      // 构建提交数据
      const submitData = {
        title: (formData.title || '').trim(),
        description: (formData.description || '').trim(),
        location: (formData.location || '').trim(),
        latitude: formData.latitude,
        longitude: formData.longitude,
        run_type: '',
        dress_code: (formData.dress_code || '').trim(),
        start_time: `${formData.start_date || ''} ${formData.start_time || ''}`.trim(),
        quota: formData.quota || 0,
        points: formData.points || 0,
        cover_image: formData.cover_image || '',
        member_only: !!formData.member_only,
        registration_fee_type: formData.registration_fee_type || '',
        registration_fee: formData.registration_fee_type ? (formData.registration_fee || 0) : 0,
        refund_policy: formData.refund_policy || 'anytime',
        is_recurring: !!formData.is_recurring,
        repeat_days: formData.is_recurring ? this.getRepeatDays() : []
      };

      // 报名截止时间（可选）
      if (formData.registration_deadline) {
        submitData.registration_deadline = `${formData.registration_deadline_date || ''} ${formData.registration_deadline_time || ''}`.trim();
      }

      if (isEdit) {
        await activityApi.update({ id, ...submitData });
        showSuccess('保存成功');
      } else {
        await activityApi.create(submitData);
        showSuccess('创建成功');
      }

      this.clearDraft();
      setTimeout(() => {
        wx.navigateBack({
          delta: 1
        });
      }, 1500);
    } catch (error) {
      console.error('提交失败', error);
      // 显示详细错误信息
      const errorMsg = error && error.message ? error.message : '提交失败，请重试';
      wx.showModal({
        title: '创建失败',
        content: errorMsg,
        showCancel: false
      });
    } finally {
      this._submitting = false;
      this.setData({ submitting: false });
    }
  }
});
