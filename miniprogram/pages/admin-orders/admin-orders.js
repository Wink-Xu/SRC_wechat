// pages/admin-orders/admin-orders.js
const { adminApi } = require('../../utils/request');
const { formatDate, formatMoney, showSuccess, showConfirm, showInfo } = require('../../utils/util');
const { requireAdmin } = require('../../utils/auth');

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
      { key: 'paid', title: '待发货' },
      { key: 'shipped', title: '已发货' },
      { key: 'completed', title: '已完成' },
      { key: 'refund_review', title: '退款审核' },
      { key: 'refund_process', title: '退款处理' }
    ],
    // 物流弹窗
    showShipModal: false,
    shipOrderId: '',
    expressCompany: '',
    expressNo: '',
    tabCounts: {}
  },

  onLoad: function () {
    if (!requireAdmin()) {
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }
    this.loadOrders();
    this.loadOrderCounts();
    // 静默补充订阅授权
    this.renewSubscribe();
  },

  // 静默补充订阅授权
  renewSubscribe: function () {
    wx.requestSubscribeMessage({
      tmplIds: ['DhgaV9rp_Cd9Iwj9OrbHu5MCM-954nzKfInFHsVDpUg'],
      success: (res) => { console.log('订阅授权结果:', res); },
      fail: (err) => { console.log('订阅授权失败（可忽略）:', err); }
    });
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

  // 获取状态值（支持多状态映射）
  getStatusValue: function (key) {
    const map = {
      all: 'all',
      paid: 'paid',
      shipped: 'shipped',
      refund_review: ['refund_requested', 'refund_approved'],
      refund_process: 'returned'
    };
    return map[key] || key;
  },

  // 加载订单列表
  loadOrders: async function () {
    const { page, pageSize, currentStatus } = this.data;

    try {
      const params = { page, limit: pageSize };
      const statusValue = this.getStatusValue(currentStatus);
      if (statusValue !== 'all') {
        params.status = statusValue;
      }

      const result = await adminApi.getOrders(params);

      const orders = (result.list || []).map(item => ({
        ...item,
        formattedTime: formatDate(item.created_at, 'MM-DD HH:mm'),
        cashPriceYuan: item.total_cash ? formatMoney(item.total_cash) : null,
        statusText: this.getStatusText(item.status)
      }));

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

  // 显示发货弹窗
  showShipModal: function (e) {
    const { id } = e.currentTarget.dataset;
    this.setData({
      showShipModal: true,
      shipOrderId: id,
      expressCompany: '',
      expressNo: ''
    });
  },

  // 关闭发货弹窗
  closeShipModal: function () {
    this.setData({
      showShipModal: false,
      shipOrderId: '',
      expressCompany: '',
      expressNo: ''
    });
  },

  // 输入快递公司
  onExpressCompanyInput: function (e) {
    this.setData({ expressCompany: e.detail.value });
  },

  // 输入快递单号
  onExpressNoInput: function (e) {
    this.setData({ expressNo: e.detail.value });
  },

  // 确认发货
  confirmShip: async function () {
    const { shipOrderId, expressCompany, expressNo } = this.data;

    if (!expressCompany.trim()) {
      showInfo('请输入快递公司');
      return;
    }
    if (!expressNo.trim()) {
      showInfo('请输入快递单号');
      return;
    }

    const confirm = await showConfirm('确认发货', `快递公司: ${expressCompany}\n快递单号: ${expressNo}`);
    if (!confirm) return;

    try {
      await adminApi.updateOrderStatus({
        orderId: shipOrderId,
        status: 'shipped',
        express_company: expressCompany.trim(),
        express_no: expressNo.trim()
      });
      showSuccess('已发货');
      this.closeShipModal();
      this.refreshOrders();
    } catch (error) {
      console.error('发货失败', error);
    }
  },

  // 同意退货
  handleApproveRefund: async function (e) {
    const { id } = e.currentTarget.dataset;

    const confirm = await showConfirm('同意退货', '确定同意退货吗？请等待买家寄回商品。');
    if (!confirm) return;

    try {
      await adminApi.updateOrderStatus({ orderId: id, status: 'refund_approved' });
      showSuccess('已同意退货');
      this.refreshOrders();
    } catch (error) {
      console.error('操作失败', error);
    }
  },

  // 确认收到退货
  handleConfirmReturn: async function (e) {
    const { id } = e.currentTarget.dataset;

    const confirm = await showConfirm('确认收货', '确定已收到买家退回的商品吗？');
    if (!confirm) return;

    try {
      await adminApi.updateOrderStatus({ orderId: id, status: 'returned' });
      showSuccess('已确认收货');
      this.refreshOrders();
    } catch (error) {
      console.error('操作失败', error);
    }
  },

  // 直接退款（用于未发货订单）
  handleDirectRefund: async function (e) {
    const { id } = e.currentTarget.dataset;

    const confirm = await showConfirm('直接退款', '确定要直接退款吗？系统将自动退回积分/恢复库存。');
    if (!confirm) return;

    try {
      await adminApi.updateOrderStatus({ orderId: id, status: 'refunded' });
      showSuccess('退款完成');
      this.refreshOrders();
    } catch (error) {
      console.error('退款失败', error);
    }
  },

  // 确认退款（已收到退货）
  handleProcessRefund: async function (e) {
    const { id } = e.currentTarget.dataset;

    const confirm = await showConfirm('确认退款', '确定要退款吗？系统将自动退回积分/恢复库存。');
    if (!confirm) return;

    try {
      await adminApi.updateOrderStatus({ orderId: id, status: 'refunded' });
      showSuccess('退款完成');
      this.refreshOrders();
    } catch (error) {
      console.error('退款失败', error);
    }
  },

  // 加载各状态订单数量（红点）
  loadOrderCounts: async function () {
    try {
      const result = await adminApi.getOrderCounts();
      if (result) {
        this.setData({ tabCounts: result });
      }
    } catch (error) {
      console.error('获取订单数量失败', error);
    }
  },

  // 获取状态文本
  getStatusText: function (status) {
    const statusMap = {
      pending: '待付款',
      paid: '待发货',
      shipped: '已发货',
      completed: '已完成',
      cancelled: '已取消',
      refund_requested: '退款审核',
      refund_approved: '已同意退货',
      returned: '退款处理',
      refunded: '已退款'
    };
    return statusMap[status] || status;
  }
});
