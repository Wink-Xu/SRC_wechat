// utils/request.js - 云函数请求封装

const { showLoading, hideLoading, showError } = require('./util');

/**
 * 调用云函数
 * @param {string} name 云函数名称
 * @param {string} action 方法名
 * @param {Object} data 参数
 * @param {Object} options 配置选项
 * @returns {Promise<Object>} 返回结果
 */
const callFunction = async (name, action, data = {}, options = {}) => {
  const { showLoad = true, showErrorMsg = true } = options;

  if (showLoad) {
    showLoading();
  }

  try {
    const res = await wx.cloud.callFunction({
      name,
      data: {
        action,
        ...data
      }
    });

    if (showLoad) {
      hideLoading();
    }

    const result = res.result;

    if (result.code !== 0) {
      if (showErrorMsg) {
        showError(result.message || '请求失败');
      }
      return Promise.reject(result);
    }

    return result.data;
  } catch (error) {
    if (showLoad) {
      hideLoading();
    }

    console.error(`云函数调用失败：${name}.${action}`, error);

    if (showErrorMsg) {
      showError(error.message || '网络错误，请重试');
    }

    return Promise.reject(error);
  }
};

// 用户相关接口
const userApi = {
  login: (data) => callFunction('user', 'login', data),
  updateProfile: (data) => callFunction('user', 'updateProfile', data),
  applyMembership: (data) => callFunction('user', 'applyMembership', data),
  getMembers: (data) => callFunction('user', 'getMembers', data),
  approveMember: (data) => callFunction('user', 'approveMember', data),
  setRole: (data) => callFunction('user', 'setRole', data),
  kickOut: (data) => callFunction('user', 'kickOut', data)
};

// 活动相关接口
const activityApi = {
  create: (data) => callFunction('activity', 'create', data),
  update: (data) => callFunction('activity', 'update', data),
  updatePhotos: (data) => callFunction('activity', 'updatePhotos', data),
  updateCoverImage: (data) => callFunction('activity', 'updateCoverImage', data),
  publish: (data) => callFunction('activity', 'publish', data),
  cancel: (data) => callFunction('activity', 'cancel', data),
  delete: (data) => callFunction('activity', 'delete', data),
  getList: (data) => callFunction('activity', 'getList', data, { showLoad: false }),
  getDetail: (data) => callFunction('activity', 'getDetail', data),
  register: (data) => callFunction('activity', 'register', data),
  cancelRegistration: (data) => callFunction('activity', 'cancelRegistration', data),
  checkIn: (data) => callFunction('activity', 'checkIn', data),
  selfCheckIn: (data) => callFunction('activity', 'selfCheckIn', data),
  getCheckInQrCode: (data) => callFunction('activity', 'getCheckInQrCode', data, { showLoad: false }),
  finishActivityWithCheckIn: (data) => callFunction('activity', 'finishActivityWithCheckIn', data, { showErrorMsg: false }),
  uploadPhotos: (data) => callFunction('activity', 'uploadPhotos', data)
};

// 积分相关接口
const pointsApi = {
  getBalance: (data) => callFunction('points', 'getBalance', data, { showLoad: false }),
  getLogs: (data) => callFunction('points', 'getLogs', data, { showLoad: false }),
  getRanking: (data) => callFunction('points', 'getRanking', data, { showLoad: false }),
  addPoints: (data) => callFunction('points', 'addPoints', data),
  deductPoints: (data) => callFunction('points', 'deductPoints', data)
};

// 商城相关接口
const shopApi = {
  getProductList: (data) => callFunction('shop', 'getProductList', data, { showLoad: false }),
  getProductDetail: (data) => callFunction('shop', 'getProductDetail', data),
  createOrder: (data) => callFunction('shop', 'createOrder', data),
  payOrderByPoints: (data) => callFunction('shop', 'payOrderByPoints', data),
  payOrderByWechat: (data) => callFunction('shop', 'payOrderByWechat', data),
  getOrders: (data) => callFunction('shop', 'getOrders', data, { showLoad: false }),
  getOrderDetail: (data) => callFunction('shop', 'getOrderDetail', data),
  cancelOrder: (data) => callFunction('shop', 'cancelOrder', data),
  confirmReceipt: (data) => callFunction('shop', 'confirmReceipt', data)
};

// 管理后台接口
const adminApi = {
  getStatistics: (data) => callFunction('admin', 'getStatistics', data),
  getPendingMembers: (data) => callFunction('admin', 'getPendingMembers', data),
  manageProduct: (data) => callFunction('admin', 'manageProduct', data),
  updateOrderStatus: (data) => callFunction('admin', 'updateOrderStatus', data),
  getOrders: (data) => callFunction('admin', 'getOrders', data, { showLoad: false })
};

// 调试接口
const debugApi = {
  checkUser: (data) => callFunction('debug', 'checkUser', data, { showLoad: false, showErrorMsg: false }),
  fixUserRole: (data) => callFunction('debug', 'fixUserRole', data),
  checkActivities: (data) => callFunction('debug', 'checkActivities', data, { showLoad: false, showErrorMsg: false })
};

module.exports = {
  callFunction,
  userApi,
  activityApi,
  pointsApi,
  shopApi,
  adminApi,
  debugApi
};
