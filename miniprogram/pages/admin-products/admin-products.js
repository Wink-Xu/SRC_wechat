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
      image: '',
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
        image: '',
        points_price: '',
        cash_price: '',
        stock: ''
      }
    });
  },

  // 编辑商品
  editProduct: function (e) {
    const { id } = e.currentTarget.dataset;
    const product = this.data.products.find(p => p._id === id);

    if (product) {
      this.setData({
        showAddModal: true,
        editingId: id,
        formData: {
          name: product.name,
          description: product.description || '',
          image: product.image || '',
          points_price: product.points_price ? String(product.points_price) : '',
          cash_price: product.cash_price ? String(product.cash_price / 100) : '',
          stock: String(product.stock)
        }
      });
    }
  },

  // 输入表单
  onInputChange: function (e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [`formData.${field}`]: e.detail.value
    });
  },

  // 选择图片
  chooseImage: function () {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tempFilePath = res.tempFilePaths[0];
        // 上传到云存储
        const cloudPath = `products/${Date.now()}-${Math.random().toString(36).substr(2)}.jpg`;
        try {
          const uploadRes = await wx.cloud.uploadFile({
            cloudPath,
            filePath: tempFilePath
          });
          this.setData({
            'formData.image': uploadRes.fileID
          });
        } catch (error) {
          showInfo('图片上传失败');
        }
      }
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
      image: formData.image,
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