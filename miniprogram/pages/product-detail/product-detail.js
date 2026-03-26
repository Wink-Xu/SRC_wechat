// pages/product-detail/product-detail.js
const { shopApi, pointsApi } = require('../../utils/request');
const { formatMoney, showSuccess, showInfo, showConfirm } = require('../../utils/util');
const { isLoggedIn, isMember, requireLogin } = require('../../utils/auth');

Page({
  data: {
    id: '',
    product: null,
    loading: true,
    quantity: 1,
    myPoints: 0,
    address: null,
    payMethod: 'wechat', // points | wechat
    showBuyModal: false // 购买确认弹窗
  },

  onLoad: function (options) {
    if (options.id) {
      this.setData({ id: options.id });
      this.loadProduct();
      this.loadMyPoints();
    }
  },

  onShow: function () {
    // 加载默认地址
    this.loadDefaultAddress();
  },

  // 加载商品详情
  loadProduct: async function () {
    try {
      const result = await shopApi.getProductDetail({ id: this.data.id });
      const product = result.product;
      product.cashPriceYuan = product.cash_price ? formatMoney(product.cash_price) : null;

      // 处理图片：将 fileID 转换为临时 URL
      let displayImages = product.images || [];
      if (displayImages.length > 0 && displayImages[0] && displayImages[0].startsWith('cloud://')) {
        try {
          const tempUrlResult = await wx.cloud.getTempFileURL({
            fileList: displayImages
          });
          product.displayImages = tempUrlResult.fileList.map(file => file.tempFileURL || file.fileID);
        } catch (photoErr) {
          console.error('获取商品图片临时链接失败', photoErr);
          product.displayImages = displayImages;
        }
      } else {
        product.displayImages = displayImages;
      }

      this.setData({
        product,
        loading: false
      });

      wx.setNavigationBarTitle({
        title: product.name
      });
    } catch (error) {
      console.error('加载商品详情失败', error);
      this.setData({ loading: false });
    }
  },

  // 加载我的积分
  loadMyPoints: async function () {
    if (!isLoggedIn()) return;

    try {
      const result = await pointsApi.getBalance();
      this.setData({ myPoints: result.points || 0 });
    } catch (error) {
      console.error('加载积分失败', error);
    }
  },

  // 加载默认地址
  loadDefaultAddress: function () {
    const address = wx.getStorageSync('defaultAddress');
    if (address) {
      this.setData({ address });
    }
  },

  // 减少数量
  decreaseQuantity: function () {
    if (this.data.quantity > 1) {
      this.setData({ quantity: this.data.quantity - 1 });
    }
  },

  // 增加数量
  increaseQuantity: function () {
    const { product, quantity } = this.data;
    if (quantity < product.stock) {
      this.setData({ quantity: quantity + 1 });
    }
  },

  // 切换支付方式
  onPayMethodChange: function (e) {
    this.setData({ payMethod: e.currentTarget.dataset.method });
  },

  // 选择地址
  selectAddress: function () {
    wx.chooseAddress({
      success: (res) => {
        console.log('[选择地址] 成功:', res);
        const address = {
          name: res.userName,
          phone: res.telNumber,
          province: res.provinceName,
          city: res.cityName,
          district: res.countyName,
          detail: res.detailInfo
        };
        this.setData({ address });
        wx.setStorageSync('defaultAddress', address);
      },
      fail: (err) => {
        console.error('[选择地址] 失败:', err);
        // 用户拒绝授权或取消选择
        if (err.errMsg && err.errMsg.includes('auth deny')) {
          wx.showModal({
            title: '提示',
            content: '您未授权收货地址，请在设置中开启权限',
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting();
              }
            }
          });
        } else if (err.errMsg && err.errMsg.includes('cancel')) {
          // 用户取消选择，不做处理
        } else {
          wx.showToast({
            title: '选择地址失败',
            icon: 'none'
          });
        }
      }
    });
  },

  // 提交订单
  handleSubmit: async function () {
    if (!requireLogin()) return;

    const { product, quantity, address, payMethod, myPoints } = this.data;

    // 检查库存
    if (product.stock < quantity) {
      showInfo('库存不足');
      return;
    }

    // 检查地址
    if (!address) {
      showInfo('请选择收货地址');
      return;
    }

    // 检查积分支付
    if (payMethod === 'points') {
      const totalPoints = product.points_price * quantity;
      if (myPoints < totalPoints) {
        showInfo('积分不足');
        return;
      }
    }

    const confirm = await showConfirm(
      '确认购买',
      payMethod === 'points'
        ? `将使用 ${product.points_price * quantity} 积分兑换`
        : `将支付 ¥${(product.cash_price * quantity / 100).toFixed(2)}`
    );

    if (!confirm) return;

    try {
      // 创建订单
      const orderResult = await shopApi.createOrder({
        productId: product._id,
        quantity,
        payMethod,
        address
      });

      const orderId = orderResult.orderId;

      if (payMethod === 'points') {
        // 积分支付
        await shopApi.payOrderByPoints({ orderId });
        showSuccess('兑换成功');
        this.goToOrderDetail(orderId);
      } else {
        // 微信支付
        const payResult = await shopApi.payOrderByWechat({ orderId });
        this.doWechatPay(payResult, orderId);
      }
    } catch (error) {
      console.error('下单失败', error);
    }
  },

  // 执行微信支付
  doWechatPay: function (payResult, orderId) {
    wx.requestPayment({
      timeStamp: payResult.timeStamp,
      nonceStr: payResult.nonceStr,
      package: payResult.package,
      signType: payResult.signType,
      paySign: payResult.paySign,
      success: () => {
        showSuccess('支付成功');
        this.goToOrderDetail(orderId);
      },
      fail: (err) => {
        console.error('支付失败', err);
        showInfo('支付已取消');
      }
    });
  },

  // 跳转到订单详情
  goToOrderDetail: function (orderId) {
    setTimeout(() => {
      wx.redirectTo({
        url: `/pages/order-detail/order-detail?id=${orderId}`
      });
    }, 1500);
  },

  // 分享
  onShareAppMessage: function () {
    return {
      title: this.data.product?.name || '商品推荐',
      path: `/pages/product-detail/product-detail?id=${this.data.id}`
    };
  },

  // 预览细节图片
  previewDetailImage: function (e) {
    const { index } = e.currentTarget.dataset;
    const images = this.data.product.displayImages || this.data.product.images || [];
    wx.previewImage({
      current: images[index],
      urls: images
    });
  },

  // 显示购买确认弹窗
  showBuyConfirm: function () {
    this.setData({ showBuyModal: true });
  },

  // 隐藏购买确认弹窗
  hideBuyConfirm: function () {
    this.setData({ showBuyModal: false });
  },

  // 空操作（防止冒泡）
  noop: function () {},

  // 确认购买
  confirmBuy: async function () {
    const { product, quantity, address, payMethod, myPoints } = this.data;

    // 检查库存
    if (product.stock < quantity) {
      showInfo('库存不足');
      return;
    }

    // 检查地址
    if (!address) {
      showInfo('请选择收货地址');
      return;
    }

    // 检查积分支付
    if (payMethod === 'points') {
      const totalPoints = product.points_price * quantity;
      if (myPoints < totalPoints) {
        showInfo('积分不足');
        return;
      }
    }

    const confirm = await showConfirm(
      '确认购买',
      payMethod === 'points'
        ? `将使用 ${product.points_price * quantity} 积分兑换`
        : `将支付 ¥${(product.cash_price * quantity / 100).toFixed(2)}`
    );

    if (!confirm) return;

    try {
      // 隐藏弹窗
      this.hideBuyConfirm();

      // 创建订单
      const orderResult = await shopApi.createOrder({
        productId: product._id,
        quantity,
        payMethod,
        address
      });

      const orderId = orderResult.orderId;

      if (payMethod === 'points') {
        // 积分支付
        await shopApi.payOrderByPoints({ orderId });
        showSuccess('兑换成功');
        this.goToOrderDetail(orderId);
      } else {
        // 微信支付
        const payResult = await shopApi.payOrderByWechat({ orderId });
        this.doWechatPay(payResult, orderId);
      }
    } catch (error) {
      console.error('下单失败', error);
    }
  }
});