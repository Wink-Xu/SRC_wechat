// pages/admin-coffee/admin-coffee.js
const { coffeeApi } = require('../../utils/request');

Page({
  data: {
    products: [],
    loading: true
  },

  onLoad: function () {
    this.loadProducts();
  },

  onShow: function () {
    this.loadProducts();
  },

  loadProducts: async function () {
    try {
      const result = await coffeeApi.adminGetProducts({});
      this.setData({
        products: result.list || [],
        loading: false
      });
    } catch (error) {
      console.error('加载商品失败', error);
      this.setData({ loading: false });
    }
  },

  toggleStatus: async function (e) {
    const id = e.currentTarget.dataset.id;
    try {
      await coffeeApi.adminManageProduct({ id, action: 'toggle' });
      this.loadProducts();
    } catch (error) {
      wx.showToast({ title: error.message || '操作失败', icon: 'none' });
    }
  },

  goToAdd: function () {
    wx.navigateTo({ url: '/pages/admin-coffee-edit/admin-coffee-edit' });
  },

  goToEdit: function (e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/admin-coffee-edit/admin-coffee-edit?id=${id}` });
  },

  getCategoryName: function (category) {
    const map = {
      americano: '美式',
      latte: '拿铁',
      special: '特调',
      decaf: '无咖啡因',
      pour_over: '单品手冲',
      recharge: '充值套餐'
    };
    return map[category] || category;
  }
});