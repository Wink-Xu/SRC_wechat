// app.js
const mockData = require('./utils/mock-data');

App({
  // 云函数模式开关：true=使用本地模拟数据，false=使用云函数
  USE_MOCK: false,

  // 当前角色（仅 Mock 模式有效）
  // 'guest' - 游客 | 'member' - 团员 | 'leader' - 团长 | 'admin' - 管理员 | 'pending' - 待审批
  CURRENT_ROLE: 'admin',

  globalData: {
    userInfo: null,
    isLoggedIn: false,
    isMember: false,      // 是否是团员（已批准）
    isAdmin: false,       // 是否是管理员
    isLeader: false,      // 是否是团长
    isGuest: true         // 默认是游客（未登录）
  },

  onLaunch: function () {
    // Mock 模式下不初始化云开发
    if (this.USE_MOCK) {
      console.log('[Mock Mode] 使用本地模拟数据，不初始化云开发');
      // Mock 模式下默认为游客模式，可以浏览内容
      this.setMockRole(this.CURRENT_ROLE);
      console.log('[Mock Mode] 默认为游客模式，可以浏览内容');
    } else {
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
    }
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

  // Mock 模式切换角色
  setMockRole: function(role) {
    if (!this.USE_MOCK) return;

    // 游客模式也设置用户信息
    if (role === 'guest') {
      const users = mockData.users;
      const user = users.guest;
      this.updateUserInfo(user);
      console.log('[Mock Mode] 游客模式，可以浏览内容', user);
      return;
    }

    const users = mockData.users;
    const user = users[role] || users.member;
    this.updateUserInfo(user);
    console.log('[Mock Mode] 切换角色为：' + role, user);
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
    return new Promise((resolve, reject) => {
      // Mock 模式下直接返回模拟用户
      if (this.USE_MOCK) {
        const mockUser = mockData.currentUser;
        this.updateUserInfo(mockUser);
        resolve(mockUser);
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
          }).then(resolve).catch(reject);
        },
        fail: (err) => {
          console.error('getUserProfile fail', err);
          reject(err);
        }
      });
    });
  }
});
