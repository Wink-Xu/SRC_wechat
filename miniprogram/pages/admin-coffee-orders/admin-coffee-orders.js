// pages/admin-coffee-orders/admin-coffee-orders.js
const { coffeeApi } = require('../../utils/request');

Page({
  data: {
    orders: [],
    loading: true,
    statusFilter: 'all',
    searchKeyword: '',
    startDate: '',
    endDate: '',
    maxDate: '',
    showDateFilter: false
  },

  onLoad: function () {
    // 设置最大日期为今天
    const today = new Date();
    const maxDate = this.formatDate(today);
    this.setData({ maxDate });
    this.loadOrders();
  },

  // 格式化日期 YYYY-MM-DD
  formatDate: function (date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  loadOrders: async function () {
    try {
      const params = {
        status: this.data.statusFilter,
        keyword: this.data.searchKeyword,
        startDate: this.data.startDate,
        endDate: this.data.endDate
      };
      const result = await coffeeApi.adminGetOrders(params);
      const orders = (result.list || []).map(order => ({
        ...order,
        statusText: this.getStatusText(order.status),
        itemsText: order.items.map(item => `${item.product_name} x${item.quantity}`).join('、')
      }));
      this.setData({ orders, loading: false });
    } catch (error) {
      console.error('加载订单失败', error);
      this.setData({ loading: false });
    }
  },

  // 获取状态文本
  getStatusText: function (status) {
    const map = {
      'pending': '待处理',
      'paid': '已支付',
      'processing': '制作中',
      'completed': '已完成',
      'cancelled': '已取消'
    };
    return map[status] || status;
  },

  // 搜索输入
  onSearchInput: function (e) {
    this.setData({ searchKeyword: e.detail.value });
  },

  // 搜索确认
  onSearch: function () {
    this.setData({ loading: true });
    this.loadOrders();
  },

  // 显示/隐藏日期筛选
  showFilter: function () {
    this.setData({ showDateFilter: !this.data.showDateFilter });
  },

  // 开始日期改变
  onStartDateChange: function (e) {
    this.setData({ startDate: e.detail.value, loading: true }, () => {
      this.loadOrders();
    });
  },

  // 结束日期改变
  onEndDateChange: function (e) {
    this.setData({ endDate: e.detail.value, loading: true }, () => {
      this.loadOrders();
    });
  },

  // 清除日期筛选
  clearDateFilter: function () {
    this.setData({ startDate: '', endDate: '', loading: true }, () => {
      this.loadOrders();
    });
  },

  // 筛选状态改变
  onFilterChange: function (e) {
    this.setData({ statusFilter: e.currentTarget.dataset.status, loading: true });
    this.loadOrders();
  },

  // 更新订单状态
  updateStatus: async function (e) {
    const { id, status } = e.currentTarget.dataset;
    const statusText = this.getStatusText(status);

    wx.showModal({
      title: '确认操作',
      content: `确定要将订单标记为"${statusText}"吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            await coffeeApi.adminUpdateOrderStatus({ orderId: id, status });
            wx.showToast({ title: '更新成功', icon: 'success' });
            this.loadOrders();
          } catch (error) {
            wx.showToast({ title: error.message || '操作失败', icon: 'none' });
          }
        }
      }
    });
  },

  // 复制订单号
  copyOrderNo: function (e) {
    const orderNo = e.currentTarget.dataset.no;
    wx.setClipboardData({
      data: orderNo,
      success: () => {
        wx.showToast({ title: '已复制', icon: 'success' });
      }
    });
  },

  // 跳转订单详情
  goToDetail: function (e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/coffee-order-detail/coffee-order-detail?id=${id}&from=admin` });
  },

  // 导出订单
  exportOrders: function () {
    wx.showModal({
      title: '导出订单',
      content: '确定要导出当前筛选条件下的订单数据吗？',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '生成文件中...' });
          try {
            const result = await coffeeApi.exportOrders({
              status: this.data.statusFilter,
              startDate: this.data.startDate,
              endDate: this.data.endDate
            });

            wx.hideLoading();

            if (result.csvContent && result.count > 0) {
              // 创建 CSV 文件
              const fileName = `咖啡订单_${new Date().getTime()}.csv`;
              const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;

              // 写入文件
              const fs = wx.getFileSystemManager();
              fs.writeFile({
                filePath: filePath,
                data: result.csvContent,
                encoding: 'utf-8-sig',
                success: () => {
                  // 让用户选择分享方式
                  wx.shareFileMessage({
                    filePath: filePath,
                    fileName: fileName,
                    success: () => {
                      wx.showToast({ title: `已导出 ${result.count} 条订单`, icon: 'success' });
                    },
                    fail: () => {
                      // 如果分享失败，用打开方式
                      wx.openDocument({
                        filePath: filePath,
                        showMenu: true,
                        success: () => {
                          wx.showToast({ title: `已导出 ${result.count} 条订单`, icon: 'success' });
                        }
                      });
                    }
                  });
                },
                fail: (err) => {
                  console.error('写入文件失败', err);
                  wx.showToast({ title: '保存文件失败', icon: 'none' });
                }
              });
            } else {
              wx.showToast({ title: '没有可导出的订单', icon: 'none' });
            }
          } catch (error) {
            wx.hideLoading();
            wx.showToast({ title: error.message || '导出失败', icon: 'none' });
          }
        }
      }
    });
  }
});