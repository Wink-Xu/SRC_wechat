// pages/debug/debug.js
const app = getApp();

Page({
  data: {
    currentRole: 'member',
    roles: [
      { role: 'member', name: '团员', desc: '普通团员，可以报名参加活动' },
      { role: 'leader', name: '团长', desc: '团长权限，可以管理所有功能' },
      { role: 'admin', name: '管理员', desc: '管理员权限，可以管理成员、活动等' }
    ],
    userInfo: null
  },

  onLoad: function () {
    this.loadUserInfo();
  },

  loadUserInfo: function () {
    const userInfo = app.globalData.userInfo;
    const currentRole = userInfo ? userInfo.role : 'member';
    this.setData({
      userInfo,
      currentRole
    });
  },

  switchRole: function (e) {
    const { role } = e.currentTarget.dataset;
    const app = getApp();

    // 清除缓存
    wx.removeStorageSync('userInfo');

    // 切换角色
    app.setMockRole(role);

    // 更新页面显示
    this.loadUserInfo();

    wx.showToast({
      title: '切换成功',
      icon: 'success'
    });
  },

  clearCache: function () {
    wx.clearStorageSync();
    wx.showToast({
      title: '缓存已清除，请重启小程序',
      icon: 'success'
    });
  }
});
