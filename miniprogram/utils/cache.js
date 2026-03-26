// utils/cache.js - 缓存工具

/**
 * 缓存管理器
 * 用于缓存图片URL、数据等，减少重复请求
 */

const CACHE_PREFIX = 'src_cache_';
const CACHE_EXPIRE_TIME = 30 * 60 * 1000; // 30分钟过期

/**
 * 设置缓存
 * @param {string} key 缓存键
 * @param {any} data 缓存数据
 * @param {number} expire 过期时间（毫秒），默认30分钟
 */
const setCache = (key, data, expire = CACHE_EXPIRE_TIME) => {
  try {
    const cacheData = {
      data,
      expire: Date.now() + expire
    };
    wx.setStorageSync(CACHE_PREFIX + key, cacheData);
  } catch (e) {
    console.error('缓存设置失败', e);
  }
};

/**
 * 获取缓存
 * @param {string} key 缓存键
 * @returns {any} 缓存数据，过期或不存在返回null
 */
const getCache = (key) => {
  try {
    const cacheData = wx.getStorageSync(CACHE_PREFIX + key);
    if (!cacheData) return null;

    // 检查是否过期
    if (cacheData.expire && cacheData.expire < Date.now()) {
      wx.removeStorageSync(CACHE_PREFIX + key);
      return null;
    }

    return cacheData.data;
  } catch (e) {
    return null;
  }
};

/**
 * 删除缓存
 * @param {string} key 缓存键
 */
const removeCache = (key) => {
  try {
    wx.removeStorageSync(CACHE_PREFIX + key);
  } catch (e) { }
};

/**
 * 清除所有缓存
 */
const clearAllCache = () => {
  try {
    const info = wx.getStorageInfoSync();
    info.keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        wx.removeStorageSync(key);
      }
    });
  } catch (e) { }
};

/**
 * 图片URL缓存管理器
 */
const imageUrlCache = {
  cache: {},

  /**
   * 获取图片URL（优先从内存缓存，再到本地缓存）
   * @param {string} fileID 云存储fileID
   * @returns {string|null} 缓存的URL
   */
  get(fileID) {
    // 先查内存缓存
    if (this.cache[fileID]) {
      return this.cache[fileID];
    }
    // 再查本地缓存
    const url = getCache('img_' + fileID);
    if (url) {
      this.cache[fileID] = url;
      return url;
    }
    return null;
  },

  /**
   * 设置图片URL缓存
   * @param {string} fileID 云存储fileID
   * @param {string} url 临时URL
   */
  set(fileID, url) {
    this.cache[fileID] = url;
    setCache('img_' + fileID, url, 60 * 60 * 1000); // 图片URL缓存1小时
  },

  /**
   * 批量设置
   * @param {Object} map fileID -> url 的映射
   */
  setBatch(map) {
    Object.keys(map).forEach(fileID => {
      if (map[fileID]) {
        this.set(fileID, map[fileID]);
      }
    });
  }
};

module.exports = {
  setCache,
  getCache,
  removeCache,
  clearAllCache,
  imageUrlCache
};