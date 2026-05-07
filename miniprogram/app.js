// app.js
App({
  globalData: {
    userInfo: null,
    isLoggedIn: false,
    isMember: false,       // 是否是团员（已批准）
    isAdmin: false,        // 是否是管理员
    isLeader: false,       // 是否是团长
    isGuest: true          // 默认是游客（未登录）
  },

  onLaunch: function () {
    // 初始化云开发（splash 页可能已经初始化过，重复调用无影响）
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云开发');
    } else {
      wx.cloud.init({
        env: 'cloud1-2gyhe7s5efa4155f',
        traceUser: true
      });
    }

    // 检查登录状态
    this.checkLoginStatus();
  },

  // 当小程序从微信主界面扫码进入时处理
  onShow: function (options) {
    // 处理微信扫码进入的场景
    if (options && options.scene) {
      this.handleScanCode(options.scene);
    }
  },

  // 处理扫码进入
  handleScanCode: function (scene) {
    let qrData;
    try {
      qrData = JSON.parse(decodeURIComponent(scene));
    } catch (e) {
      qrData = { type: 'checkin', activity_id: scene };
    }

    // 处理签到二维码
    if (qrData.type === 'checkin' && qrData.activity_id) {
      // 延迟跳转，确保 app 初始化完成
      setTimeout(() => {
        wx.navigateTo({
          url: `/pages/scan-checkin/scan-checkin?scene=${encodeURIComponent(scene)}`,
          fail: () => {
            // 如果已在 scan-checkin 页面，尝试重定向
            wx.redirectTo({
              url: `/pages/scan-checkin/scan-checkin?scene=${encodeURIComponent(scene)}`
            });
          }
        });
      }, 300);
    }
  },

  // 检查登录状态
  checkLoginStatus: function () {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.globalData.userInfo = userInfo;
      this.globalData.isLoggedIn = true;
      this.globalData.isMember = userInfo.status === 'approved';
      // 支持所有管理员类型
      this.globalData.isAdmin = userInfo.role === 'activity_admin' || userInfo.role === 'coffee_admin' || userInfo.role === 'leader';
      this.globalData.isLeader = userInfo.role === 'leader';
    }
  },

  // 更新用户状态
  updateUserInfo: function (userInfo) {
    this.globalData.userInfo = userInfo;
    this.globalData.isLoggedIn = !!userInfo;
    // 只有 status === 'approved' 才是团员
    this.globalData.isMember = userInfo && userInfo.status === 'approved';
    // 支持所有管理员类型
    this.globalData.isAdmin = userInfo && (userInfo.role === 'activity_admin' || userInfo.role === 'coffee_admin' || userInfo.role === 'leader');
    this.globalData.isLeader = userInfo && userInfo.role === 'leader';
    // status === 'guest' 是游客
    this.globalData.isGuest = userInfo && userInfo.status === 'guest';
    wx.setStorageSync('userInfo', userInfo);
  },

  // 清除登录状态
  clearUserInfo: function () {
    this.globalData.userInfo = null;
    this.globalData.isLoggedIn = false;
    this.globalData.isMember = false;
    this.globalData.isAdmin = false;
    this.globalData.isLeader = false;
    wx.removeStorageSync('userInfo');
  },

  // 刷新用户状态（无需重新登录）
  refreshUserStatus: async function () {
    if (!this.globalData.isLoggedIn || !this.globalData.userInfo) {
      return null;
    }

    try {
      const { userApi } = require('./utils/request');
      const result = await userApi.getUserInfo();

      if (result) {
        // 合并本地昵称和头像（本地可能更新过）
        const mergedUser = {
          ...result,
          nickname: this.globalData.userInfo.nickname || result.nickname,
          avatar: this.globalData.userInfo.avatar || result.avatar
        };
        this.updateUserInfo(mergedUser);
        return mergedUser;
      }
    } catch (error) {
      console.error('[刷新用户状态失败]', error);
    }
    return null;
  },

  // 处理登录（在 profile 页面调用）
  handleLogin: function () {
    const that = this;
    return new Promise((resolve, reject) => {
      // 检查云开发是否已初始化
      if (!wx.cloud) {
        console.error('云开发未初始化');
        reject(new Error('云开发未初始化'));
        return;
      }

      // 真实模式：调用微信授权登录
      wx.getUserProfile({
        desc: '用于完善用户资料',
        lang: 'zh_CN',
        success: (res) => {
          const userInfo = res.userInfo;

          // 调用云函数登录
          const { userApi } = require('./utils/request');
          userApi.login({
            nickName: userInfo.nickName,
            avatarUrl: userInfo.avatarUrl,
            gender: userInfo.gender
          }).then((loginResult) => {
            // 登录成功后更新全局用户状态
            const cloudUser = loginResult.data || loginResult;
            that.updateUserInfo(cloudUser);
            resolve(cloudUser);
          }).catch((err) => {
            console.error('[登录] 云函数调用失败:', err);
            reject(err);
          });
        },
        fail: (err) => {
          console.error('[登录] getUserProfile fail', err);
          reject(err);
        }
      });
    });
  }
});
