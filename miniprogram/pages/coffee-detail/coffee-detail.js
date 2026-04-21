// pages/coffee-detail/coffee-detail.js
const { coffeeApi } = require('../../utils/request');

Page({
  data: {
    productId: '',
    product: {},
    showSpecModal: false,
    quantity: 1,
    remark: ''
  },

  onLoad: function (options) {
    if (options.id) {
      this.setData({ productId: options.id });
      this.loadProduct(options.id);
    }
  },

  onShow: function () {
    // 重新加载商品数据，确保显示最新的商品信息
    if (this.data.productId) {
      this.loadProduct(this.data.productId);
    }
  },

  // 加载商品详情
  loadProduct: async function (id) {
    try {
      const result = await coffeeApi.getProductDetail({ id });
      const product = result.product;

      // 处理图片
      if (product.image && product.image.startsWith('cloud://')) {
        try {
          const tempUrlResult = await wx.cloud.getTempFileURL({
            fileList: [product.image]
          });
          if (tempUrlResult.fileList[0] && tempUrlResult.fileList[0].tempFileURL) {
            product.display_image = tempUrlResult.fileList[0].tempFileURL;
          }
        } catch (err) {
          console.error('获取图片临时链接失败', err);
        }
      }

      this.setData({ product });
    } catch (error) {
      console.error('加载商品详情失败', error);
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  // 打开选规格弹窗
  openSpecModal: function () {
    this.setData({
      showSpecModal: true,
      quantity: 1,
      remark: ''
    });
  },

  // 关闭选规格弹窗
  closeSpecModal: function () {
    this.setData({
      showSpecModal: false,
      quantity: 1,
      remark: ''
    });
  },

  // 输入备注
  onRemarkInput: function (e) {
    this.setData({ remark: e.detail.value });
  },

  // 减少数量
  decreaseQuantity: function () {
    if (this.data.quantity > 1) {
      this.setData({ quantity: this.data.quantity - 1 });
    }
  },

  // 增加数量
  increaseQuantity: function () {
    this.setData({ quantity: this.data.quantity + 1 });
  },

  // 确认加入购物车
  confirmAdd: function () {
    const { product, quantity, remark } = this.data;
    this.addToCart(product, quantity, remark);
    this.setData({ showSpecModal: false, quantity: 1, remark: '' });
  },

  // 加入购物车
  addToCart: function (product, quantity = 1, remark = '') {
    const cart = wx.getStorageSync('coffee_cart') || [];
    const existIndex = cart.findIndex(
      item => item.product_id === product._id && item.remark === remark
    );

    if (existIndex > -1) {
      cart[existIndex].quantity += quantity;
    } else {
      cart.push({
        product_id: product._id,
        product_name: product.name,
        price: product.price,
        quantity: quantity,
        remark: remark,
        category: product.category,
        image: product.display_image || product.image
      });
    }

    wx.setStorageSync('coffee_cart', cart);
    wx.showToast({ title: '已加入购物车', icon: 'success' });

    setTimeout(() => {
      wx.navigateBack();
    }, 1500);
  },

  // 返回
  goBack: function () {
    wx.navigateBack();
  }
});