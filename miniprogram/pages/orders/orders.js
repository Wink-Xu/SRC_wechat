// pages/orders/orders.js
const { shopApi } = require('../../utils/request');
const { formatDate } = require('../../utils/util');
const { requireMember } = require('../../utils/auth');

Page({
  data: {
    orders: [],
    loading: true,
    loadingMore: false,
    hasMore: true,
    page: 1,
    pageSize: 10,
    currentStatus: 'all',
    statusTabs: [
      { key: 'all', title: '全部' },
      { key: 'pending', title: '待支付' },
      { key: 'paid', title: '已支付' },
      { key: 'shipped', title: '已发货' },
      { key: 'completed', title: '已完成' }
    ]
  },

  onLoad: function () {
    if (!requireMember()) {
      setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 1500);
      return;
    }
    this.loadOrders();
  },

  onPullDownRefresh: function () {
    this.refreshOrders().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom: function () {
    if (this.data.hasMore && !this.data.loadingMore) {
      this.loadMoreOrders();
    }
  },

  // 刷新订单
  refreshOrders: async function () {
    this.setData({
      page: 1,
      hasMore: true,
      orders: []
    });
    return this.loadOrders();
  },

  // 加载订单列表
  loadOrders: async function () {
    const { page, pageSize, currentStatus } = this.data;

    try {
      const params = { page, limit: pageSize };
      if (currentStatus !== 'all') {
        params.status = currentStatus;
      }

      const result = await shopApi.getOrders(params);

      // 收集需要转换的商品图片 fileID
      const allOrders = result.list || [];
      const imageFileIDs = allOrders
        .filter(item => item.product_image && item.product_image.startsWith('cloud://'))
        .map(item => item.product_image);

      // 批量转换 fileID 为临时 URL
      let tempUrlMap = {};
      if (imageFileIDs.length > 0) {
        try {
          const tempUrlResult = await wx.cloud.getTempFileURL({
            fileList: imageFileIDs
          });
          tempUrlResult.fileList.forEach(file => {
            tempUrlMap[file.fileID] = file.tempFileURL;
          });
        } catch (err) {
          console.error('获取订单商品图片临时链接失败', err);
        }
      }

      const orders = allOrders.map(item => {
        const processed = {
          ...item,
          formattedTime: formatDate(item.created_at, 'MM-DD HH:mm'),
          statusText: this.getStatusText(item.status)
        };
        // 转换商品图片
        if (item.product_image && item.product_image.startsWith('cloud://') && tempUrlMap[item.product_image]) {
          processed.display_product_image = tempUrlMap[item.product_image];
        }
        return processed;
      });

      this.setData({
        orders: page === 1 ? orders : [...this.data.orders, ...orders],
        hasMore: orders.length >= pageSize,
        loading: false
      });
    } catch (error) {
      console.error('加载订单失败', error);
      this.setData({ loading: false });
    }
  },

  // 加载更多
  loadMoreOrders: async function () {
    this.setData({
      loadingMore: true,
      page: this.data.page + 1
    });

    try {
      await this.loadOrders();
    } finally {
      this.setData({ loadingMore: false });
    }
  },

  // 切换状态
  onTabChange: function (e) {
    const { key } = e.currentTarget.dataset;
    this.setData({
      currentStatus: key,
      orders: [],
      page: 1,
      hasMore: true
    });
    this.loadOrders();
  },

  // 跳转到订单详情
  goToDetail: function (e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/order-detail/order-detail?id=${id}`
    });
  },

  // 获取状态文本
  getStatusText: function (status) {
    const statusMap = {
      pending: '待支付',
      paid: '已支付',
      shipped: '已发货',
      completed: '已完成',
      cancelled: '已取消'
    };
    return statusMap[status] || status;
  }
});