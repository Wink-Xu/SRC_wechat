// pages/coffee/coffee.js
const { coffeeApi } = require('../../utils/request');

Page({
  data: {
    storeName: 'AndThen',
    storeAddress: '武汉市 AndThen 跑者驿站',
    categories: [
      { key: 'americano', name: '美式' },
      { key: 'latte', name: '拿铁' },
      { key: 'special', name: '特调' },
      { key: 'decaf', name: '无咖啡因' },
      { key: 'pour_over', name: '单品手冲' },
      { key: 'recharge', name: '充值套餐' }
    ],
    products: [],
    groupedProducts: [],
    cart: [],
    cartCount: 0,
    cartTotal: 0,
    showTempModal: false,
    selectedProduct: null,
    quantity: 1,
    remark: '',
    loading: true,
    scrollToView: '',
    scrollToTab: '',
    currentCategory: 'americano'
  },

  onLoad: function () {
    this.loadAllProducts();
    this.loadCartFromStorage();
  },

  onShow: function () {
    this.loadCartFromStorage();
    this.updateCartSummary();
    // 重新加载商品数据，确保显示最新的商品信息
    this.loadAllProducts();
  },

  onReady: function () {
    // 标记页面已就绪
    this.pageReady = true;
    // 如果商品已加载，初始化观察器
    if (this.data.groupedProducts.length > 0) {
      this.cacheCategoryPositions();
    }
  },

  onUnload: function () {
    // 清理观察器
    if (this.observer) {
      this.observer.disconnect();
    }
  },

  // 加载所有商品
  loadAllProducts: async function () {
    try {
      const result = await coffeeApi.getProducts({});
      const products = result.list || [];

      console.log('获取到商品列表:', products);

      // 处理商品图片
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
        if (p.image && p.image.startsWith('cloud://')) {
          // 云存储图片，使用临时链接
          return { ...p, display_image: tempUrlMap[p.image] || p.image };
        } else if (p.image) {
          // 普通 URL 图片
          return { ...p, display_image: p.image };
        }
        // 没有图片
        return p;
      });

      console.log('处理后的商品列表:', processedProducts);

      this.setData({
        products: processedProducts,
        loading: false
      });
      this.groupProductsByCategory();
    } catch (error) {
      console.error('加载商品失败', error);
      this.setData({ loading: false });
    }
  },

  // 按分类分组商品
  groupProductsByCategory: function () {
    const categories = this.data.categories;
    const products = this.data.products;
    const grouped = [];

    categories.forEach(cat => {
      const catProducts = products.filter(p => p.category === cat.key);
      if (catProducts.length > 0) {
        grouped.push({
          key: cat.key,
          name: cat.name,
          products: catProducts
        });
      }
    });

    this.setData({ groupedProducts: grouped }, () => {
      // 数据渲染完成后，缓存分类位置
      this.cacheCategoryPositions();
    });
    this.updateGroupedProductCartQuantities();
  },

  // 缓存分类位置（在滚动容器中的绝对偏移量）
  cacheCategoryPositions: function () {
    this.categoryPositions = {};
    const query = wx.createSelectorQuery().in(this);

    // 获取各个分类标题的位置
    this.data.groupedProducts.forEach(group => {
      query.select('#category-' + group.key).boundingClientRect();
    });

    query.exec((res) => {
      if (!res || res.length !== this.data.groupedProducts.length) {
        console.log('位置查询结果不完整', res);
        return;
      }

      // 使用第一个分类的 top 作为基准
      const baseTop = res[0] ? res[0].top : 0;

      this.data.groupedProducts.forEach((group, index) => {
        const rect = res[index];
        if (rect) {
          // 计算相对于第一个分类的位置
          this.categoryPositions[group.key] = rect.top - baseTop;
        }
      });

      console.log('分类位置缓存完成（相对偏移量）:', this.categoryPositions);
    });
  },

  // 更新分组商品中的购物车数量
  updateGroupedProductCartQuantities: function () {
    const grouped = this.data.groupedProducts.map(group => {
      return {
        ...group,
        products: group.products.map(p => {
          const coldItem = this.data.cart.find(item => item.product_id === p._id && item.temperature === 'cold');
          const hotItem = this.data.cart.find(item => item.product_id === p._id && item.temperature === 'hot');
          return {
            ...p,
            cartQuantity: (coldItem ? coldItem.quantity : 0) + (hotItem ? hotItem.quantity : 0)
          };
        })
      };
    });
    this.setData({ groupedProducts: grouped });
  },

  // 滚动到指定分类
  scrollToCategory: function (e) {
    const category = e.currentTarget.dataset.category;

    // 先更新当前分类
    this.setData({
      currentCategory: category,
      scrollToTab: 'tab-' + category,
      scrollToView: 'category-' + category
    });
  },

  // 监听列表滚动
  onProductListScroll: function (e) {
    const scrollTop = e.detail.scrollTop;
    const groupedProducts = this.data.groupedProducts;

    if (!groupedProducts || groupedProducts.length === 0) return;
    if (!this.categoryPositions) return;

    // 从后往前遍历，找到第一个 scrollTop 超过该分类位置的
    for (let i = groupedProducts.length - 1; i >= 0; i--) {
      const group = groupedProducts[i];
      const categoryKey = group.key;
      const categoryTop = this.categoryPositions[categoryKey];

      if (categoryTop !== undefined && scrollTop >= categoryTop - 50) {
        if (this.data.currentCategory !== categoryKey) {
          this.setData({
            currentCategory: categoryKey,
            scrollToTab: 'tab-' + categoryKey
          });
        }
        break; // 找到后退出
      }
    }
  },

  // 页面滚动监听（不使用）
  onPageScroll: function (e) {
    // scroll-view 内部滚动，不使用页面滚动
  },

  // 从本地存储加载购物车
  loadCartFromStorage: function () {
    const cart = wx.getStorageSync('coffee_cart') || [];
    this.setData({ cart });
    this.updateCartSummary();
    this.updateGroupedProductCartQuantities();
  },

  // 更新购物车统计
  updateCartSummary: function () {
    const cart = this.data.cart;
    let count = 0;
    let total = 0;
    cart.forEach(item => {
      count += item.quantity;
      total += item.price * item.quantity;
    });
    this.setData({ cartCount: count, cartTotal: total });
  },

  // 阻止事件冒泡
  stopPropagation: function () {
    // 空函数，仅用于阻止冒泡
  },

  // 减少购物车数量
  decreaseCartQuantity: function (e) {
    const product = e.currentTarget.dataset.product;
    const cart = [...this.data.cart];

    // 优先减少冷的，如果没有冷的就减少热的
    let existIndex = cart.findIndex(item => item.product_id === product._id && item.temperature === 'cold');
    if (existIndex === -1) {
      existIndex = cart.findIndex(item => item.product_id === product._id && item.temperature === 'hot');
    }

    if (existIndex > -1) {
      cart[existIndex].quantity -= 1;
      if (cart[existIndex].quantity <= 0) {
        cart.splice(existIndex, 1);
      }
      this.setData({ cart });
      this.updateCartSummary();
      wx.setStorageSync('coffee_cart', cart);
      this.updateGroupedProductCartQuantities();
    }
  },

  // 增加购物车数量
  increaseCartQuantity: function (e) {
    const product = e.currentTarget.dataset.product;
    const cart = [...this.data.cart];

    // 优先增加冷的，如果没有冷的就增加热的
    let existIndex = cart.findIndex(item => item.product_id === product._id && item.temperature === 'cold');
    if (existIndex === -1) {
      existIndex = cart.findIndex(item => item.product_id === product._id && item.temperature === 'hot');
    }

    if (existIndex > -1) {
      cart[existIndex].quantity += 1;
    } else {
      // 如果都不存在，添加一个冷的
      cart.push({
        product_id: product._id,
        product_name: product.name,
        price: product.price,
        temperature: 'cold',
        temperatureText: '冷',
        quantity: 1,
        category: product.category,
        image: product.display_image || product.image
      });
    }

    this.setData({ cart });
    this.updateCartSummary();
    wx.setStorageSync('coffee_cart', cart);
    this.updateGroupedProductCartQuantities();
  },

  // 点击选规格
  onAddToCart: function (e) {
    const product = e.currentTarget.dataset.product;

    // 打开选择规格弹窗
    this.setData({
      showTempModal: true,
      selectedProduct: product,
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
    const { selectedProduct, quantity, remark } = this.data;
    this.addToCart(selectedProduct, quantity, remark);
    this.setData({ showTempModal: false, selectedProduct: null, quantity: 1, remark: '' });
  },

  // 关闭弹窗
  closeTempModal: function () {
    this.setData({ showTempModal: false, selectedProduct: null, quantity: 1, remark: '' });
  },

  // 加入购物车
  addToCart: function (product, quantity = 1, remark = '') {
    const cart = [...this.data.cart];
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

    this.setData({ cart });
    this.updateCartSummary();
    wx.setStorageSync('coffee_cart', cart);
    wx.showToast({ title: '已加入购物车', icon: 'success' });
  },

  // 去购物车
  goToCart: function () {
    if (this.data.cartCount === 0) {
      wx.showToast({ title: '购物车为空', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/coffee-cart/coffee-cart' });
  },

  // 去商品详情
  goToDetail: function (e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/coffee-detail/coffee-detail?id=${id}` });
  },

  // 打开地图
  openMap: function () {
    wx.openLocation({
      latitude: 30.554596,
      longitude: 114.340098,
      name: 'AndThen 跑者驿站',
      address: '武汉市 AndThen 跑者驿站',
      scale: 16
    });
  }
});