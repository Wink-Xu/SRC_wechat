// utils/util.js - 通用工具函数

/**
 * 格式化日期
 * @param {Date|string|number} date 日期
 * @param {string} format 格式
 * @returns {string} 格式化后的日期字符串
 */
const formatDate = (date, format = 'YYYY-MM-DD HH:mm') => {
  if (!date) return '';

  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
};

/**
 * 格式化相对时间
 * @param {Date|string|number} date 日期
 * @returns {string} 相对时间字符串
 */
const formatRelativeTime = (date) => {
  if (!date) return '';

  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) {
    return formatDate(date, 'MM-DD HH:mm');
  } else if (days > 0) {
    return `${days}天前`;
  } else if (hours > 0) {
    return `${hours}小时前`;
  } else if (minutes > 0) {
    return `${minutes}分钟前`;
  } else {
    return '刚刚';
  }
};

/**
 * 格式化金额（分转元）
 * @param {number} amount 金额（分）
 * @returns {string} 格式化后的金额
 */
const formatMoney = (amount) => {
  if (typeof amount !== 'number') return '0.00';
  return (amount / 100).toFixed(2);
};

/**
 * 格式化手机号（隐藏中间4位）
 * @param {string} phone 手机号
 * @returns {string} 格式化后的手机号
 */
const formatPhone = (phone) => {
  if (!phone || phone.length !== 11) return phone;
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
};

/**
 * 生成唯一ID
 * @returns {string} 唯一ID
 */
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

/**
 * 生成订单编号
 * @returns {string} 订单编号
 */
const generateOrderNo = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `SRC${year}${month}${day}${random}`;
};

/**
 * 防抖函数
 * @param {Function} fn 要防抖的函数
 * @param {number} delay 延迟时间
 * @returns {Function} 防抖后的函数
 */
const debounce = (fn, delay = 300) => {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
};

/**
 * 节流函数
 * @param {Function} fn 要节流的函数
 * @param {number} delay 延迟时间
 * @returns {Function} 节流后的函数
 */
const throttle = (fn, delay = 300) => {
  let lastTime = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastTime >= delay) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
};

/**
 * 检查手机号格式
 * @param {string} phone 手机号
 * @returns {boolean} 是否有效
 */
const isValidPhone = (phone) => {
  return /^1[3-9]\d{9}$/.test(phone);
};

/**
 * 深拷贝
 * @param {Object} obj 要拷贝的对象
 * @returns {Object} 拷贝后的对象
 */
const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (obj instanceof Object) {
    const copy = {};
    Object.keys(obj).forEach(key => {
      copy[key] = deepClone(obj[key]);
    });
    return copy;
  }
  return obj;
};

/**
 * 显示加载提示
 * @param {string} title 提示文字
 */
const showLoading = (title = '加载中...') => {
  wx.showLoading({
    title,
    mask: true
  });
};

/**
 * 隐藏加载提示
 */
const hideLoading = () => {
  wx.hideLoading();
};

/**
 * 显示成功提示
 * @param {string} title 提示文字
 */
const showSuccess = (title) => {
  wx.showToast({
    title,
    icon: 'success',
    duration: 2000
  });
};

/**
 * 显示错误提示
 * @param {string} title 提示文字
 */
const showError = (title) => {
  wx.showToast({
    title,
    icon: 'error',
    duration: 2000
  });
};

/**
 * 显示普通提示
 * @param {string} title 提示文字
 */
const showInfo = (title) => {
  wx.showToast({
    title,
    icon: 'none',
    duration: 2000
  });
};

/**
 * 显示确认对话框
 * @param {string} title 标题
 * @param {string} content 内容
 * @returns {Promise<boolean>} 用户选择
 */
const showConfirm = (title, content) => {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      success: (res) => {
        resolve(res.confirm);
      },
      fail: () => {
        resolve(false);
      }
    });
  });
};

module.exports = {
  formatDate,
  formatRelativeTime,
  formatMoney,
  formatPhone,
  generateId,
  generateOrderNo,
  debounce,
  throttle,
  isValidPhone,
  deepClone,
  showLoading,
  hideLoading,
  showSuccess,
  showError,
  showInfo,
  showConfirm
};