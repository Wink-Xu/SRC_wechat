// pages/shop/shop.js
const { shopApi } = require('../../utils/request');
const { formatMoney } = require('../../utils/util');
const { imageUrlCache, setCache, getCache } = require('../../utils/cache');

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
      // 尝试从缓存读取数据（仅第一页）
      if (page === 1) {
        const cachedData = getCache('products_list');
        if (cachedData) {
          this.setData({
            products: cachedData.products || [],
            hasMore: cachedData.hasMore !== false,
            loading: false
          });
          // 后台静默刷新数据
          this.refreshProductsData(page, pageSize, true);
          return;
        }
      }

      await this.refreshProductsData(page, pageSize, false);
    } catch (error) {
      console.error('加载商品列表失败', error);
      this.setData({ loading: false });
    }
  },

  // 刷新商品数据
  refreshProductsData: async function (page, pageSize, isBackgroundRefresh) {
    const result = await shopApi.getProductList({ page, limit: pageSize });

    // 收集所有需要转换的图片 fileID
    const allProducts = result.list || [];

    const imageFileIDs = [];
    allProducts.forEach(item => {
      if (item.images && item.images.length > 0) {
        item.images.forEach(img => {
          if (img && img.startsWith('cloud://')) {
            imageFileIDs.push(img);
          }
        });
      }
      if (item.image && item.image.startsWith('cloud://')) {
        imageFileIDs.push(item.image);
      }
    });

    // 批量转换 fileID 为临时 URL（使用缓存）
    let tempUrlMap = {};
    const uncachedFileIDs = [];

    // 先从缓存获取
    imageFileIDs.forEach(fileID => {
      const cachedUrl = imageUrlCache.get(fileID);
      if (cachedUrl) {
        tempUrlMap[fileID] = cachedUrl;
      } else {
        uncachedFileIDs.push(fileID);
      }
    });

    // 仅对未缓存的 fileID 请求临时 URL
    if (uncachedFileIDs.length > 0) {
      try {
        const tempUrlResult = await wx.cloud.getTempFileURL({
          fileList: uncachedFileIDs
        });
        const newUrls = {};
        tempUrlResult.fileList.forEach(file => {
          if (file.status === 0 && file.tempFileURL) {
            tempUrlMap[file.fileID] = file.tempFileURL;
            newUrls[file.fileID] = file.tempFileURL;
          }
        });
        // 批量缓存新的 URL
        imageUrlCache.setBatch(newUrls);
      } catch (err) {
        console.error('获取商品图片临时链接失败', err);
      }
    }

    const products = allProducts.map(item => {
      const processed = {
        ...item,
        cashPriceYuan: item.cash_price ? formatMoney(item.cash_price) : null
      };
      if (item.images && item.images.length > 0) {
        processed.displayImages = item.images.map(img => {
          if (img && img.startsWith('cloud://') && tempUrlMap[img]) {
            return tempUrlMap[img];
          }
          return img;
        });
      }
      if (item.image && item.image.startsWith('cloud://') && tempUrlMap[item.image]) {
        processed.displayImage = tempUrlMap[item.image];
      }
      return processed;
    });

    // 缓存第一页数据
    if (page === 1) {
      setCache('products_list', { products, hasMore: products.length >= pageSize }, 5 * 60 * 1000); // 5分钟缓存
    }

    this.setData({
      products: page === 1 ? products : [...this.data.products, ...products],
      hasMore: products.length >= pageSize,
      loading: false
    });

    // 预加载下一页
    if (!isBackgroundRefresh) {
      this.preloadNextPage();
    }
  },

  // 加载更多
  loadMoreProducts: async function () {
    // 如果有预加载数据，直接使用
    if (this._preloadedData && this._preloadedPage === this.data.page + 1) {
      this.setData({
        loadingMore: true,
        page: this.data.page + 1
      });

      const result = this._preloadedData;
      this._preloadedData = null;

      const products = (result.list || []).map(item => {
        const processed = {
          ...item,
          cashPriceYuan: item.cash_price ? formatMoney(item.cash_price) : null
        };
        return processed;
      });

      this.setData({
        products: [...this.data.products, ...products],
        hasMore: products.length >= this.data.pageSize,
        loadingMore: false
      });

      // 预加载下一页
      this.preloadNextPage();
      return;
    }

    this.setData({
      loadingMore: true,
      page: this.data.page + 1
    });

    try {
      await this.refreshProductsData(this.data.page, this.data.pageSize, false);
    } finally {
      this.setData({ loadingMore: false });
    }
  },

  // 预加载下一页
  preloadNextPage: function () {
    if (this.data.hasMore && !this.data.loadingMore && !this._preloading) {
      this._preloading = true;
      this._preloadedPage = this.data.page + 1;

      const self = this;
      shopApi.getProductList({ page: this._preloadedPage, limit: this.data.pageSize })
        .then(function(result) {
          self._preloadedData = result;
          self._preloading = false;
        })
        .catch(function() {
          self._preloading = false;
        });
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