// utils/auth.js - 权限验证

const { ROLES, USER_STATUS } = require('./constants');

/**
 * 检查是否已登录
 * @returns {boolean}
 */
const isLoggedIn = () => {
  const app = getApp();
  return app.globalData.isLoggedIn;
};

/**
 * 检查是否是正式团员
 * @returns {boolean}
 */
const isMember = () => {
  const app = getApp();
  return app.globalData.isMember;
};

/**
 * 检查是否是游客（已登录但未申请入团）
 * @returns {boolean}
 */
const isGuest = () => {
  const app = getApp();
  return app.globalData.isGuest;
};

/**
 * 检查是否是管理员
 * @returns {boolean}
 */
const isAdmin = () => {
  const app = getApp();
  return app.globalData.isAdmin;
};

/**
 * 检查是否是团长
 * @returns {boolean}
 */
const isLeader = () => {
  const app = getApp();
  return app.globalData.isLeader;
};

/**
 * 获取用户信息
 * @returns {Object|null}
 */
const getUserInfo = () => {
  const app = getApp();
  return app.globalData.userInfo;
};

/**
 * 获取用户角色
 * @returns {string}
 */
const getUserRole = () => {
  const userInfo = getUserInfo();
  return userInfo ? userInfo.role : ROLES.GUEST;
};

/**
 * 获取用户状态
 * @returns {string}
 */
const getUserStatus = () => {
  const userInfo = getUserInfo();
  return userInfo ? userInfo.status : USER_STATUS.GUEST;
};

/**
 * 检查是否有权限
 * @param {Array} allowedRoles 允许的角色列表
 * @returns {boolean}
 */
const hasPermission = (allowedRoles) => {
  const role = getUserRole();
  return allowedRoles.includes(role);
};

/**
 * 要求登录
 * 如果未登录则提示用户去"我的"页面登录
 * @returns {boolean} 是否已登录
 */
const requireLogin = () => {
  if (!isLoggedIn()) {
    wx.showModal({
      title: '请先登录',
      content: '请前往"我的"页面进行登录',
      showCancel: false,
      success: () => {
        // 用户确认后，跳转到"我的"页面
        wx.switchTab({
          url: '/pages/profile/profile'
        });
      }
    });
    return false;
  }
  return true;
};

/**
 * 要求团员身份
 * 如果不是团员则提示
 * @returns {boolean} 是否是团员
 */
const requireMember = () => {
  if (!requireLogin()) return false;

  if (!isMember()) {
    wx.showToast({
      title: '您还不是团员，请等待审批',
      icon: 'none'
    });
    return false;
  }
  return true;
};

/**
 * 要求管理员身份
 * 如果不是管理员则提示
 * @returns {boolean} 是否是管理员
 */
const requireAdmin = () => {
  if (!requireLogin()) return false;

  if (!isAdmin()) {
    wx.showToast({
      title: '您没有权限执行此操作',
      icon: 'none'
    });
    return false;
  }
  return true;
};

/**
 * 要求团长身份
 * 如果不是团长则提示
 * @returns {boolean} 是否是团长
 */
const requireLeader = () => {
  if (!requireLogin()) return false;

  if (!isLeader()) {
    wx.showToast({
      title: '只有团长可以执行此操作',
      icon: 'none'
    });
    return false;
  }
  return true;
};

module.exports = {
  isLoggedIn,
  isMember,
  isGuest,
  isAdmin,
  isLeader,
  getUserInfo,
  getUserRole,
  getUserStatus,
  hasPermission,
  requireLogin,
  requireMember,
  requireAdmin,
  requireLeader
};