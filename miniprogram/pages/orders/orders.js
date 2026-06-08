// pages/orders/orders.js
const { shopApi } = require('../../utils/request');
const { formatDate, showSuccess, showInfo } = require('../../utils/util');
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
      { key: 'pending', title: '待付款' },
      { key: 'paid', title: '待发货' },
      { key: 'shipped', title: '待收货' },
      { key: 'refund', title: '待退款' }
    ],
    tabCounts: {}
  },

  onLoad: function () {
    if (!requireMember()) {
      setTimeout(() => wx.switchTab({ url: '/pages/activities/activities' }), 1500);
      return;
    }
    this.loadOrders();
    this.loadOrderCounts();
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
        params.status = this.getStatusValue(currentStatus);
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

  // 加载各状态订单数量（红点）
  loadOrderCounts: async function () {
    try {
      const result = await shopApi.getOrderCounts();
      if (result) {
        this.setData({ tabCounts: result });
      }
    } catch (error) {
      console.error('获取订单数量失败', error);
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

  // 跳转到商品详情
  goToProduct: function (e) {
    const { productId } = e.currentTarget.dataset;
    if (productId) {
      wx.navigateTo({
        url: `/pages/product-detail/product-detail?id=${productId}`
      });
    }
  },

  // 去支付
  payOrder: async function (e) {
    const { id } = e.currentTarget.dataset;
    // 阻止事件冒泡到卡片点击
    if (e.stopPropagation) e.stopPropagation();

    try {
      const payResult = await shopApi.payOrderByWechat({ orderId: id });
      wx.requestPayment({
        timeStamp: payResult.timeStamp,
        nonceStr: payResult.nonceStr,
        package: payResult.package,
        signType: payResult.signType,
        paySign: payResult.paySign,
        success: () => {
          showSuccess('支付成功');
          wx.requestSubscribeMessage({
            tmplIds: ['PPJGcyK4yaRO6FcJFJsrwXoico9heyOdsyBVwjt35-U'],
            success: (res) => { console.log('订阅消息授权结果:', res); },
            fail: (err) => { console.log('订阅消息授权失败:', err); }
          });
          this.refreshOrders();
        },
        fail: (err) => {
          console.error('支付失败', err);
          showInfo('支付已取消');
        }
      });
    } catch (error) {
      console.error('支付失败', error);
    }
  },

  // 获取状态值（支持多状态映射）
  getStatusValue: function (key) {
    const map = {
      all: 'all',
      pending: 'pending',
      paid: 'paid',
      shipped: 'shipped',
      refund: ['refund_requested', 'refund_approved', 'returned']
    };
    return map[key] || key;
  },

  // 获取状态文本
  getStatusText: function (status) {
    const statusMap = {
      pending: '待付款',
      paid: '待发货',
      shipped: '待收货',
      completed: '已完成',
      cancelled: '已取消',
      refund_requested: '退款审核中',
      refund_approved: '已同意退货',
      returned: '退货已收到',
      refunded: '已退款'
    };
    return statusMap[status] || status;
  }
});