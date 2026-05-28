// pages/order-detail/order-detail.js
const { shopApi } = require('../../utils/request');
const { formatDate, formatMoney, showSuccess, showConfirm, showInfo } = require('../../utils/util');

Page({
  data: {
    id: '',
    order: null,
    loading: true
  },

  onLoad: function (options) {
    if (options.id) {
      this.setData({ id: options.id });
      this.loadOrder();
    }
  },

  // 加载订单详情
  loadOrder: async function () {
    try {
      const result = await shopApi.getOrderDetail({ id: this.data.id });
      const order = result.order;

      order.formattedTime = formatDate(order.created_at, 'YYYY-MM-DD HH:mm');
      order.formattedPaidTime = order.paid_at ? formatDate(order.paid_at, 'YYYY-MM-DD HH:mm') : '';
      order.formattedShippedTime = order.shipped_at ? formatDate(order.shipped_at, 'YYYY-MM-DD HH:mm') : '';
      order.formattedRefundRequestedTime = order.refund_requested_at ? formatDate(order.refund_requested_at, 'YYYY-MM-DD HH:mm') : '';
      order.cashPriceYuan = order.total_cash ? formatMoney(order.total_cash) : '';
      order.statusText = this.getStatusText(order.status);

      // 转换商品图片 fileID 为临时 URL
      if (order.product_image && order.product_image.startsWith('cloud://')) {
        try {
          const tempUrlResult = await wx.cloud.getTempFileURL({
            fileList: [order.product_image]
          });
          order.display_product_image = tempUrlResult.fileList[0]?.tempURL || order.product_image;
        } catch (err) {
          console.error('获取商品图片临时链接失败', err);
        }
      }

      this.setData({
        order,
        loading: false
      });
    } catch (error) {
      console.error('加载订单详情失败', error);
      this.setData({ loading: false });
    }
  },

  // 取消订单
  handleCancel: async function () {
    const confirm = await showConfirm('取消订单', '确定要取消此订单吗？');
    if (!confirm) return;

    try {
      await shopApi.cancelOrder({ orderId: this.data.id });
      showSuccess('订单已取消');
      this.loadOrder();
    } catch (error) {
      console.error('取消订单失败', error);
    }
  },

  // 去支付
  handlePay: async function () {
    try {
      const payResult = await shopApi.payOrderByWechat({ orderId: this.data.id });
      wx.requestPayment({
        timeStamp: payResult.timeStamp,
        nonceStr: payResult.nonceStr,
        package: payResult.package,
        signType: payResult.signType,
        paySign: payResult.paySign,
        success: () => {
          showSuccess('支付成功');
          this.loadOrder();
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

  // 确认收货
  handleConfirmReceipt: async function () {
    const confirm = await showConfirm('确认收货', '确定已收到商品吗？');
    if (!confirm) return;

    try {
      await shopApi.confirmReceipt({ orderId: this.data.id });
      showSuccess('已确认收货');
      this.loadOrder();
    } catch (error) {
      console.error('确认收货失败', error);
    }
  },

  // 申请退款
  handleRequestRefund: async function () {
    const { order } = this.data;
    const isPaid = order.status === 'paid';
    const content = isPaid
      ? '订单尚未发货，确定要申请退款吗？'
      : '确定要申请退款吗？请先将商品寄回。';

    const confirm = await showConfirm('申请退款', content);
    if (!confirm) return;

    try {
      await shopApi.requestRefund({ orderId: this.data.id });
      showSuccess('退款申请已提交');
      this.loadOrder();
    } catch (error) {
      console.error('申请退款失败', error);
    }
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

  // 复制订单号
  copyOrderNo: function () {
    wx.setClipboardData({
      data: this.data.order.order_no,
      success: () => {
        showSuccess('已复制');
      }
    });
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
      refund_approved: '已同意退货，请寄回商品',
      returned: '退货已收到，等待退款',
      refunded: '已退款'
    };
    return statusMap[status] || status;
  }
});