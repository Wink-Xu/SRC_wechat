// pages/test-panel/test-panel.js
const app = getApp();
const { testUserApi } = require('../../utils/request');

// 定义测试用户，每个都有独立的 openid
const TEST_USERS = {
  leader: {
    _id: 'test_leader_001',
    openid: 'test_openid_leader_001',
    nickname: '测试团长',
    avatar: '',
    phone: '13800000001',
    role: 'leader',
    status: 'approved',
    points: 999,
    roleText: '团长'
  },
  admin: {
    _id: 'test_admin_001',
    openid: 'test_openid_admin_001',
    nickname: '测试管理员',
    avatar: '',
    phone: '13800000002',
    role: 'admin',
    status: 'approved',
    points: 500,
    roleText: '管理员'
  },
  member: {
    _id: 'test_member_001',
    openid: 'test_openid_member_001',
    nickname: '测试团员',
    avatar: '',
    phone: '13800000003',
    role: 'member',
    status: 'approved',
    points: 100,
    roleText: '团员'
  },
  pending: {
    _id: 'test_pending_001',
    openid: 'test_openid_pending_001',
    nickname: '测试待审批',
    avatar: '',
    phone: '13800000004',
    role: 'member',
    status: 'pending',
    points: 0,
    roleText: '待审批'
  },
  guest: {
    _id: 'test_guest_001',
    openid: 'test_openid_guest_001',
    nickname: '测试游客',
    avatar: '',
    phone: '',
    role: 'member',
    status: 'guest',
    points: 0,
    roleText: '游客'
  }
};

Page({
  data: {
    currentRole: 'member',
    currentUser: null,
    dbUsersReady: false
  },

  onLoad: function () {
    this.updateCurrentRole();
    this.checkDbUsers();
  },

  onShow: function () {
    this.updateCurrentRole();
    this.checkDbUsers();
  },

  // 更新当前角色
  updateCurrentRole: function () {
    const userInfo = app.globalData.userInfo;
    let currentRole = 'guest';
    let currentUser = null;

    if (userInfo && userInfo.openid) {
      // 检查是否是测试用户
      for (const [role, user] of Object.entries(TEST_USERS)) {
        if (user.openid === userInfo.openid) {
          currentRole = role;
          currentUser = user;
          break;
        }
      }
    }

    this.setData({ currentRole, currentUser });
  },

  // 检查数据库中的测试用户
  checkDbUsers: async function () {
    try {
      const result = await testUserApi.listTestUsers();
      const list = result.list || [];
      const allExist = list.every(u => u.exists);
      this.setData({ dbUsersReady: allExist });
    } catch (error) {
      console.error('检查测试用户失败', error);
      this.setData({ dbUsersReady: false });
    }
  },

  // 创建测试用户到数据库
  createDbUsers: async function () {
    try {
      wx.showLoading({ title: '创建中...' });
      const result = await testUserApi.createTestUsers();
      wx.hideLoading();

      const created = result.results?.filter(r => r.status === 'created').length || 0;
      const exists = result.results?.filter(r => r.status === 'exists').length || 0;

      wx.showModal({
        title: '创建完成',
        content: `新创建: ${created} 个，已存在: ${exists} 个`,
        showCancel: false
      });

      this.checkDbUsers();
    } catch (error) {
      wx.hideLoading();
      console.error('创建测试用户失败', error);
      wx.showToast({ title: '创建失败', icon: 'none' });
    }
  },

  // 切换角色
  switchRole: function (e) {
    const role = e.currentTarget.dataset.role;
    const user = TEST_USERS[role];

    if (!user) return;

    // 更新全局数据
    app.globalData.userInfo = { ...user };
    app.globalData.isLoggedIn = role !== 'guest';
    app.globalData.isMember = user.status === 'approved';
    app.globalData.isAdmin = user.role === 'admin' || user.role === 'leader';
    app.globalData.isLeader = user.role === 'leader';

    // 保存到本地
    wx.setStorageSync('userInfo', app.globalData.userInfo);

    // 更新显示
    this.setData({
      currentRole: role,
      currentUser: user
    });

    wx.showToast({
      title: '已切换为' + user.roleText,
      icon: 'success'
    });
  },

  // 返回
  goBack: function () {
    wx.navigateBack();
  }
});