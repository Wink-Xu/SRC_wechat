// pages/address-edit/address-edit.js
Page({
  data: {
    address: null,
    isEdit: false,
    formData: {
      name: '',
      phone: '',
      province: '',
      city: '',
      district: '',
      detail: ''
    }
  },

  onLoad: function (options) {
    // 如果有传入地址，则是编辑模式
    if (options.address) {
      try {
        const address = JSON.parse(decodeURIComponent(options.address));
        this.setData({
          address,
          isEdit: true,
          formData: {
            name: address.name || '',
            phone: address.phone || '',
            province: address.province || '',
            city: address.city || '',
            district: address.district || '',
            detail: address.detail || ''
          }
        });
      } catch (e) {
        console.error('解析地址失败', e);
      }
    }
  },

  // 输入姓名
  onNameInput: function (e) {
    this.setData({ 'formData.name': e.detail.value });
  },

  // 输入手机号
  onPhoneInput: function (e) {
    this.setData({ 'formData.phone': e.detail.value });
  },

  // 选择地区
  onRegionChange: function (e) {
    const region = e.detail.value;
    this.setData({
      'formData.province': region[0],
      'formData.city': region[1],
      'formData.district': region[2]
    });
  },

  // 输入详细地址
  onDetailInput: function (e) {
    this.setData({ 'formData.detail': e.detail.value });
  },

  // 保存地址
  handleSave: function () {
    const { formData } = this.data;

    if (!formData.name.trim()) {
      wx.showToast({ title: '请输入收货人姓名', icon: 'none' });
      return;
    }

    if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return;
    }

    if (!formData.province || !formData.city || !formData.district) {
      wx.showToast({ title: '请选择地区', icon: 'none' });
      return;
    }

    if (!formData.detail.trim()) {
      wx.showToast({ title: '请输入详细地址', icon: 'none' });
      return;
    }

    // 保存到本地存储
    const address = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      province: formData.province,
      city: formData.city,
      district: formData.district,
      detail: formData.detail.trim()
    };

    wx.setStorageSync('defaultAddress', address);

    wx.showToast({
      title: '保存成功',
      icon: 'success'
    });

    setTimeout(() => {
      wx.navigateBack();
    }, 1500);
  },

  // 删除地址
  handleDelete: function () {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除此地址吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('defaultAddress');
          wx.showToast({
            title: '已删除',
            icon: 'success'
          });
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        }
      }
    });
  }
});