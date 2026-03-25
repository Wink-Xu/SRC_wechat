// pages/admin-products/admin-products.js
const { adminApi, shopApi } = require('../../utils/request');
const { formatMoney, showSuccess, showConfirm, showInfo } = require('../../utils/util');
const { requireAdmin } = require('../../utils/auth');

Page({
  data: {
    products: [],
    loading: true,
    loadingMore: false,
    hasMore: true,
    page: 1,
    pageSize: 10,
    showAddModal: false,
    formData: {
      name: '',
      description: '',
      images: [],  // 改为数组支持多张图片
      points_price: '',
      cash_price: '',
      stock: ''
    },
    editingId: null
  },

  onLoad: function () {
    if (!requireAdmin()) {
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }
    this.loadProducts();
  },

  onPullDownRefresh: function () {
    this.refreshProducts().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom: function () {
    if (this.data.hasMore && !this.data.loadingMore) {
      this.loadMoreProducts();
    }
  },

  // 刷新商品列表
  refreshProducts: async function () {
    this.setData({
      page: 1,
      hasMore: true,
      products: []
    });
    return this.loadProducts();
  },

  // 加载商品列表
  loadProducts: async function () {
    const { page, pageSize } = this.data;

    try {
      const result = await shopApi.getProductList({ page, limit: pageSize, all: true });

      const products = (result.list || []).map(item => ({
        ...item,
        cashPriceYuan: item.cash_price ? formatMoney(item.cash_price) : null,
        statusText: item.status === 'available' ? '上架' : '下架'
      }));

      this.setData({
        products: page === 1 ? products : [...this.data.products, ...products],
        hasMore: products.length >= pageSize,
        loading: false
      });
    } catch (error) {
      console.error('加载商品列表失败', error);
      this.setData({ loading: false });
    }
  },

  // 加载更多
  loadMoreProducts: async function () {
    this.setData({
      loadingMore: true,
      page: this.data.page + 1
    });

    try {
      await this.loadProducts();
    } finally {
      this.setData({ loadingMore: false });
    }
  },

  // 显示添加弹窗
  showAddProduct: function () {
    this.setData({
      showAddModal: true,
      editingId: null,
      formData: {
        name: '',
        description: '',
        images: [],
        points_price: '',
        cash_price: '',
        stock: ''
      }
    });
  },

  // 编辑商品
  editProduct: function (e) {
    const { id } = e.currentTarget.dataset;
    console.log('[编辑商品] 商品 ID:', id);
    const product = this.data.products.find(p => p._id === id);
    console.log('[编辑商品] 商品数据:', product);

    if (product) {
      // 过滤掉默认图片，只显示用户上传的图片
      const images = (product.images || []).filter(img => img !== '/images/default-product.png');

      this.setData({
        showAddModal: true,
        editingId: id,
        formData: {
          name: product.name,
          description: product.description || '',
          images: images,
          points_price: product.points_price ? String(product.points_price) : '',
          cash_price: product.cash_price ? String(product.cash_price / 100) : '',
          stock: String(product.stock)
        }
      });
      console.log('[编辑商品] 表单数据已设置，图片:', this.data.formData.images);
    }
  },

  // 输入表单
  onInputChange: function (e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [`formData.${field}`]: e.detail.value
    });
  },

  // 阻止事件冒泡
  stopTap: function () {
    // 阻止点击弹窗内容时关闭
  },

  // 选择图片（支持多张）
  chooseImage: function () {
    const app = getApp();
    const currentImages = this.data.formData.images;
    const remainingCount = 9 - currentImages.length; // 最多 9 张

    console.log('[选择图片] 当前图片数量:', currentImages.length);
    console.log('[选择图片] 当前图片:', currentImages);

    if (remainingCount <= 0) {
      showInfo('最多上传 9 张图片');
      return;
    }

    wx.chooseImage({
      count: remainingCount,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        console.log('[选择图片] 选择的图片:', res.tempFilePaths);
        const tempFilePaths = res.tempFilePaths;
        // Mock 模式下直接使用临时路径
        if (app.USE_MOCK) {
          const newImages = currentImages.concat(tempFilePaths);
          console.log('[选择图片] 新图片数组:', newImages);
          this.setData({
            'formData.images': newImages
          });
          showSuccess(`已选择 ${tempFilePaths.length} 张图片`);
        } else {
          // 真实模式上传到云存储
          wx.showLoading({ title: '上传中...' });
          const uploadPromises = tempFilePaths.map((path) => {
            const cloudPath = `products/${Date.now()}-${Math.random().toString(36).substr(2)}.jpg`;
            return wx.cloud.uploadFile({ cloudPath, filePath: path });
          });

          Promise.all(uploadPromises)
            .then((results) => {
              wx.hideLoading();
              const fileIDs = results.map((res) => res.fileID);
              const newImages = currentImages.concat(fileIDs);
              this.setData({
                'formData.images': newImages
              });
              showSuccess(`上传成功 ${results.length} 张图片`);
            })
            .catch(() => {
              wx.hideLoading();
              showInfo('图片上传失败');
            });
        }
      },
      fail: () => {
        showInfo('图片选择失败');
      }
    });
  },

  // 删除图片
  deleteImage: function (e) {
    const { index } = e.currentTarget.dataset;
    console.log('[删除图片] 删除索引:', index);
    const images = this.data.formData.images.slice(); // 创建副本
    images.splice(index, 1);
    console.log('[删除图片] 删除后的图片:', images);
    this.setData({
      'formData.images': images
    });
  },

  // 预览图片
  previewImage: function (e) {
    const { index } = e.currentTarget.dataset;
    const images = this.data.formData.images;
    console.log('[预览图片] 预览索引:', index, '图片列表:', images);
    wx.previewImage({
      current: images[index],  // 使用图片 URL 而不是 index
      urls: images
    });
  },

  // 提交表单
  submitForm: async function () {
    const { formData, editingId } = this.data;

    if (!formData.name.trim()) {
      showInfo('请输入商品名称');
      return;
    }
    if (!formData.points_price && !formData.cash_price) {
      showInfo('请输入积分价格或现金价格');
      return;
    }
    if (!formData.stock || parseInt(formData.stock) <= 0) {
      showInfo('请输入正确的库存数量');
      return;
    }

    const data = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      images: formData.images,  // 使用 images 数组
      points_price: formData.points_price ? parseInt(formData.points_price) : null,
      cash_price: formData.cash_price ? Math.round(parseFloat(formData.cash_price) * 100) : null,
      stock: parseInt(formData.stock),
      status: 'available'
    };

    try {
      if (editingId) {
        await adminApi.manageProduct({ action: 'update', id: editingId, data });
        showSuccess('保存成功');
      } else {
        await adminApi.manageProduct({ action: 'create', data });
        showSuccess('添加成功');
      }

      this.setData({ showAddModal: false });
      this.refreshProducts();
    } catch (error) {
      console.error('保存失败', error);
    }
  },

  // 关闭弹窗
  closeModal: function () {
    this.setData({ showAddModal: false });
  },

  // 切换上架状态
  toggleStatus: async function (e) {
    const { id, status } = e.currentTarget.dataset;
    const newStatus = status === 'available' ? 'unavailable' : 'available';
    const actionText = newStatus === 'available' ? '上架' : '下架';

    const confirm = await showConfirm(actionText, `确定要${actionText}该商品吗？`);
    if (!confirm) return;

    try {
      await adminApi.manageProduct({
        action: 'update',
        id,
        data: { status: newStatus }
      });
      showSuccess('操作成功');
      this.refreshProducts();
    } catch (error) {
      console.error('操作失败', error);
    }
  }
});