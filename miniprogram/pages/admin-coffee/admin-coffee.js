// pages/admin-coffee/admin-coffee.js
const { coffeeApi } = require('../../utils/request');

Page({
  data: {
    products: [],
    filteredProducts: [],
    loading: true,
    currentCategory: 'all',
    categories: [
      { key: 'americano', name: '美式' },
      { key: 'latte', name: '拿铁' },
      { key: 'special', name: '特调' },
      { key: 'decaf', name: '无咖啡因' },
      { key: 'pour_over', name: '单品手冲' },
      { key: 'recharge', name: '充值套餐' }
    ],
    isShopOpen: false,
    shopStatusLoading: false
  },

  onLoad: function () {
    this.loadProducts();
    this.loadShopStatus();
  },

  onShow: function () {
    this.loadProducts();
    this.loadShopStatus();
  },

  // 加载店铺营业状态
  loadShopStatus: async function () {
    try {
      const result = await wx.cloud.callFunction({
        name: 'coffee',
        data: {
          action: 'getShopStatus'
        }
      });

      if (result.result && result.result.code === 0) {
        this.setData({ isShopOpen: result.result.data.isOpen });
      }
    } catch (error) {
      console.error('加载店铺状态失败', error);
    }
  },

  // 切换店铺营业状态
  toggleShopStatus: function () {
    const newStatus = !this.data.isShopOpen;
    const actionText = newStatus ? '开始营业' : '停止营业';

    wx.showModal({
      title: '确认操作',
      content: `确定要${actionText}吗？`,
      success: async (res) => {
        if (res.confirm) {
          this.setShopStatus(newStatus);
        }
      }
    });
  },

  // 设置店铺营业状态
  setShopStatus: async function (isOpen) {
    wx.showLoading({ title: '设置中...' });

    console.log('设置店铺状态:', isOpen);

    try {
      const result = await wx.cloud.callFunction({
        name: 'coffee',
        data: {
          action: 'setShopStatus',
          isOpen
        }
      });

      console.log('云函数返回:', result);

      // 先隐藏 loading，再更新状态
      wx.hideLoading();

      // 检查云函数是否返回错误
      if (result.result && result.result.code === -1) {
        const errorMsg = result.result.message || '操作失败';
        console.error('错误:', errorMsg);
        wx.showToast({ title: errorMsg, icon: 'none' });
        return;
      }

      if (result.result && result.result.code === 0) {
        // 立即更新状态，确保视图同步刷新
        this.setData({ isShopOpen: isOpen });

        // 显示成功提示
        wx.showToast({ title: result.result.message || '设置成功', icon: 'success' });
      } else {
        wx.showToast({ title: result.result?.message || '设置失败', icon: 'none' });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('设置店铺状态失败', error);
      wx.showToast({ title: error.message || '设置失败', icon: 'none' });
    }
  },

  loadProducts: async function () {
    try {
      const result = await coffeeApi.adminGetProducts({});
      const products = result.list || [];

      // 处理图片
      const cloudImageIds = products
        .filter(p => p.image && p.image.startsWith('cloud://'))
        .map(p => p.image);

      let tempUrlMap = {};
      if (cloudImageIds.length > 0) {
        try {
          const tempUrlResult = await wx.cloud.getTempFileURL({
            fileList: cloudImageIds
          });
          tempUrlResult.fileList.forEach(file => {
            if (file.status === 0 && file.tempFileURL) {
              tempUrlMap[file.fileID] = file.tempFileURL;
            }
          });
        } catch (err) {
          console.error('获取图片临时链接失败', err);
        }
      }

      const processedProducts = products.map(p => {
        if (p.image && p.image.startsWith('cloud://') && tempUrlMap[p.image]) {
          return { ...p, display_image: tempUrlMap[p.image] };
        } else if (p.image) {
          return { ...p, display_image: p.image };
        }
        return p;
      });

      this.setData({
        products: processedProducts,
        loading: false
      }, () => {
        this.filterProducts();
      });
    } catch (error) {
      console.error('加载商品失败', error);
      this.setData({ loading: false });
    }
  },

  // 筛选商品
  filterProducts: function () {
    const { currentCategory, products } = this.data;

    if (currentCategory === 'all') {
      this.setData({ filteredProducts: products });
    } else {
      const filtered = products.filter(p => p.category === currentCategory);
      this.setData({ filteredProducts: filtered });
    }
  },

  // 选择分类
  selectCategory: function (e) {
    const category = e.currentTarget.dataset.category;
    this.setData({ currentCategory: category }, () => {
      this.filterProducts();
    });
  },

  // 获取分类名称
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
  },

  toggleStatus: async function (e) {
    const id = e.currentTarget.dataset.id;
    try {
      await coffeeApi.adminManageProduct({ id, productAction: 'toggle' });
      this.loadProducts();
    } catch (error) {
      wx.showToast({ title: error.message || '操作失败', icon: 'none' });
    }
  },

  deleteProduct: async function (e) {
    const id = e.currentTarget.dataset.id;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个商品吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            // 需要云函数支持删除操作
            wx.showToast({ title: '删除功能开发中', icon: 'none' });
          } catch (error) {
            wx.showToast({ title: error.message || '删除失败', icon: 'none' });
          }
        }
      }
    });
  },

  goToAdd: function () {
    wx.navigateTo({ url: '/pages/admin-coffee-edit/admin-coffee-edit' });
  },

  goToEdit: function (e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/admin-coffee-edit/admin-coffee-edit?id=${id}` });
  }
});