// app.js
const mockData = require('./utils/mock-data');

App({
  // Mock 模式开关：true=使用本地模拟数据，false=使用云开发
  USE_MOCK: true,

  // 当前角色（仅 Mock 模式有效）
  CURRENT_ROLE: 'admin', // 'guest' | 'member' | 'leader' | 'admin' | 'pending'

  globalData: {
    userInfo: null,
    isLoggedIn: false,
    isMember: false,      // 是否是团员（已批准）
    isAdmin: false,       // 是否是管理员
    isLeader: false,      // 是否是团长
    isGuest: false        // 是否是游客（已登录但未申请入团）
  },

  onLaunch: function () {
    // Mock 模式下不初始化云开发
    if (this.USE_MOCK) {
      console.log('[Mock Mode] 使用本地模拟数据，不初始化云开发');
      // Mock 模式下直接设置模拟用户，忽略缓存
      this.setMockRole(this.CURRENT_ROLE);
      console.log('[Mock Mode] 已设置模拟用户数据，角色：' + this.CURRENT_ROLE);
    } else {
      // 初始化云开发
      if (!wx.cloud) {
        console.error('请使用 2.2.3 或以上的基础库以使用云开发');
      } else {
        wx.cloud.init({
          env: 'your-env-id', // 替换为你的云开发环境 ID
          traceUser: true
        });
      }

      // 检查登录状态（仅非 Mock 模式使用缓存）
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
  }
});
