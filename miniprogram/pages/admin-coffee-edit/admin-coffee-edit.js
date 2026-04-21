// pages/admin-coffee-edit/admin-coffee-edit.js
const { coffeeApi } = require('../../utils/request');

Page({
  data: {
    id: '',
    isEdit: false,
    formData: {
      name: '',
      image: '',  // 商品图片
      category: 'americano',
      price: '',
      points_price: '',
      temperature: 'both',
      description: '',
      is_available: true,
      sort_order: 0,
      is_recharge: false,
      recharge_type: 'americano',
      recharge_count: 10
    },
    displayImage: '',  // 用于显示的临时图片 URL
    categories: [
      { key: 'americano', name: '美式' },
      { key: 'latte', name: '拿铁' },
      { key: 'special', name: '特调' },
      { key: 'decaf', name: '无咖啡因' },
      { key: 'pour_over', name: '单品手冲' },
      { key: 'recharge', name: '充值套餐' }
    ],
    temperatureOptions: [
      { key: 'both', name: '冷热可选' },
      { key: 'cold_only', name: '仅冷' },
      { key: 'hot_only', name: '仅热' }
    ]
  },

  onLoad: function (options) {
    if (options.id) {
      this.setData({ id: options.id, isEdit: true });
      this.loadProduct(options.id);
    }
  },

  loadProduct: async function (id) {
    try {
      const result = await coffeeApi.getProductDetail({ id });
      const product = result.product;

      // 处理图片显示
      let displayImage = '';
      if (product.image) {
        if (product.image.startsWith('cloud://')) {
          try {
            const tempUrlResult = await wx.cloud.getTempFileURL({
              fileList: [product.image]
            });
            if (tempUrlResult.fileList[0] && tempUrlResult.fileList[0].tempFileURL) {
              displayImage = tempUrlResult.fileList[0].tempFileURL;
            }
          } catch (err) {
            console.error('获取图片临时链接失败', err);
          }
        } else {
          displayImage = product.image;
        }
      }

      this.setData({
        formData: {
          name: product.name || '',
          image: product.image || '',
          category: product.category || 'americano',
          price: String(product.price / 100) || '',
          points_price: product.points_price ? String(product.points_price) : '',
          temperature: product.temperature || 'both',
          description: product.description || '',
          is_available: product.is_available !== false,
          sort_order: product.sort_order || 0,
          is_recharge: product.is_recharge || false,
          recharge_type: product.recharge_type || 'americano',
          recharge_count: product.recharge_count || 10
        },
        displayImage: displayImage
      });
    } catch (error) {
      console.error('加载商品失败', error);
    }
  },

  // 选择图片
  chooseImage: function () {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tempFile = res.tempFiles[0];
        if (!tempFile) return;

        wx.showLoading({ title: '上传中...' });

        try {
          // 上传到云存储
          const cloudPath = `coffee_products/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
          const uploadRes = await wx.cloud.uploadFile({
            cloudPath: cloudPath,
            filePath: tempFile.tempFilePath,
            isPrivate: false
          });

          wx.hideLoading();

          this.setData({
            'formData.image': uploadRes.fileID,
            displayImage: tempFile.tempFilePath  // 显示本地临时路径
          });

          wx.showToast({ title: '上传成功', icon: 'success' });
        } catch (err) {
          wx.hideLoading();
          console.error('上传图片失败', err);
          wx.showToast({ title: '上传失败', icon: 'none' });
        }
      },
      fail: (err) => {
        console.error('选择图片失败', err);
      }
    });
  },

  // 删除图片
  deleteImage: function () {
    this.setData({
      'formData.image': '',
      displayImage: ''
    });
  },

  // 预览图片
  previewImage: function () {
    const url = this.data.displayImage || this.data.formData.image;
    if (url) {
      wx.previewImage({
        current: url,
        urls: [url]
      });
    }
  },

  onInputChange: function (e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`formData.${field}`]: e.detail.value
    });
  },

  onCategoryChange: function (e) {
    this.setData({
      'formData.category': this.data.categories[e.detail.value].key
    });
  },

  onTemperatureChange: function (e) {
    this.setData({
      'formData.temperature': this.data.temperatureOptions[e.detail.value].key
    });
  },

  onSwitchChange: function (e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`formData.${field}`]: e.detail.value
    });
  },

  onSubmit: async function () {
    const { formData, id, isEdit } = this.data;

    if (!formData.name) {
      wx.showToast({ title: '请输入商品名称', icon: 'none' });
      return;
    }

    if (!formData.price) {
      wx.showToast({ title: '请输入价格', icon: 'none' });
      return;
    }

    const submitData = {
      name: formData.name,
      image: formData.image,
      category: formData.category,
      price: Math.round(parseFloat(formData.price) * 100),
      points_price: formData.points_price ? parseInt(formData.points_price) : null,
      temperature: formData.temperature,
      description: formData.description,
      is_available: formData.is_available,
      sort_order: parseInt(formData.sort_order) || 0,
      is_recharge: formData.is_recharge,
      recharge_type: formData.recharge_type,
      recharge_count: parseInt(formData.recharge_count) || 10
    };

    try {
      if (isEdit) {
        await coffeeApi.adminManageProduct({ id, productAction: 'update', ...submitData });
      } else {
        await coffeeApi.adminManageProduct({ productAction: 'create', ...submitData });
      }
      wx.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1500);
    } catch (error) {
      wx.showToast({ title: error.message || '保存失败', icon: 'none' });
    }
  }
});