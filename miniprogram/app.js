// app.js
App({
  globalData: {
    userInfo: null,
    isLoggedIn: false,
    isMember: false,      // 是否是团员（已批准）
    isAdmin: false,       // 是否是管理员
    isLeader: false,      // 是否是团长
    isGuest: true         // 默认是游客（未登录）
  },

  onLaunch: function () {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云开发');
    } else {
      wx.cloud.init({
        env: 'cloud1-2gyhe7s5efa4155f', // 云开发环境 ID
        traceUser: true
      });
    }

    // 检查登录状态
    this.checkLoginStatus();
  },

  // 当小程序从微信主界面扫码进入时处理
  onShow: function (options) {
    console.log('onShow options:', options);

    // 处理微信扫码进入的场景
    if (options && options.scene) {
      this.handleScanCode(options.scene);
    }
  },

  // 处理扫码进入
  handleScanCode: function (scene) {
    console.log('处理扫码场景:', scene);

    let qrData;
    try {
      qrData = JSON.parse(decodeURIComponent(scene));
    } catch (e) {
      qrData = { type: 'checkin', activity_id: scene };
    }

    console.log('解析二维码数据:', qrData);

    // 处理签到二维码
    if (qrData.type === 'checkin' && qrData.activity_id) {
      // 延迟跳转，确保 app 初始化完成
      setTimeout(() => {
        wx.navigateTo({
          url: `/pages/scan-checkin/scan-checkin?scene=${encodeURIComponent(scene)}`,
          fail: (err) => {
            console.error('跳转失败', err);
            // 如果已在 scan-checkin 页面，尝试重定向
            if (err.errMsg.includes('already')) {
              wx.redirectTo({
                url: `/pages/scan-checkin/scan-checkin?scene=${encodeURIComponent(scene)}`
              });
            }
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
      this.globalData.isAdmin = userInfo.role === 'admin' || userInfo.role === 'leader';
      this.globalData.isLeader = userInfo.role === 'leader';
    }
  },

  // 更新用户状态
  updateUserInfo: function (userInfo) {
    this.globalData.userInfo = userInfo;
    this.globalData.isLoggedIn = !!userInfo;
    // 只有 status === 'approved' 才是团员
    this.globalData.isMember = userInfo && userInfo.status === 'approved';
    this.globalData.isAdmin = userInfo && (userInfo.role === 'admin' || userInfo.role === 'leader');
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
          console.log('[登录] 获取到微信用户信息:', userInfo);

          // 调用云函数登录
          const { userApi } = require('./utils/request');
          userApi.login({
            nickName: userInfo.nickName,
            avatarUrl: userInfo.avatarUrl,
            gender: userInfo.gender
          }).then((loginResult) => {
            console.log('[登录] 云函数返回:', loginResult);

            // 登录成功后更新全局用户状态
            const cloudUser = loginResult.data || loginResult;
            const mergedUser = {
              ...cloudUser,
              nickname: userInfo.nickName || cloudUser.nickname,
              avatar: userInfo.avatarUrl || cloudUser.avatar
            };
            console.log('[登录] 更新用户状态:', mergedUser);
            that.updateUserInfo(mergedUser);
            resolve(mergedUser);
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
