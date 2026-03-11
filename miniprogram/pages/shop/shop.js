// pages/shop/shop.js
const { shopApi } = require('../../utils/request');
const { formatMoney } = require('../../utils/util');

Page({
  data: {
    products: [],
    loading: true,
    loadingMore: false,
    hasMore: true,
    page: 1,
    pageSize: 10
  },

  onLoad: function () {
    this.loadProducts();
  },

  onShow: function () {
    // 刷新商品列表
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
      const result = await shopApi.getProductList({ page, limit: pageSize });

      const products = (result.list || []).map(item => ({
        ...item,
        cashPriceYuan: item.cash_price ? formatMoney(item.cash_price) : null
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

  // 跳转到商品详情
  goToDetail: function (e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/product-detail/product-detail?id=${id}`
    });
  },

  // 跳转到订单列表
  goToOrders: function () {
    wx.navigateTo({
      url: '/pages/orders/orders'
    });
  }
});