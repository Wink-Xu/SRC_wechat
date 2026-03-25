// pages/debug-db/debug-db.js - 数据库调试页面
const { callFunction, debugApi } = require('../../utils/request');

Page({
  data: {
    users: [],
    activities: [],
    userInfo: null,
    globalData: null,
    currentUserId: null,
    currentUserInDb: null,
    diagnosis: null
  },

  onLoad: function () {
    this.loadDbInfo();
  },

  async loadDbInfo() {
    try {
      wx.showLoading({ title: '加载中...' });

      // 调用 debug 云函数获取诊断信息
      const checkUserResult = await debugApi.checkUser({});

      // 获取用户数据
      const usersResult = await callFunction('admin', 'getMembers', { status: 'all' }, {
        showLoad: false,
        showErrorMsg: false
      });

      // 获取活动数据
      const activitiesResult = await callFunction('activity', 'getList', {
        all: true,
        status: 'all'
      }, {
        showLoad: false,
        showErrorMsg: false
      });

      const app = getApp();

      this.setData({
        users: usersResult?.list || [],
        activities: activitiesResult?.list || [],
        userInfo: app.globalData.userInfo,
        globalData: {
          isLoggedIn: app.globalData.isLoggedIn,
          isLeader: app.globalData.isLeader,
          isAdmin: app.globalData.isAdmin,
          isMember: app.globalData.isMember
        },
        currentUserInDb: checkUserResult?.diagnosis || null,
        diagnosis: this.analyzeIssue(checkUserResult?.diagnosis, activitiesResult?.list || [])
      });

      wx.hideLoading();

      console.log('=== 数据库调试信息 ===');
      console.log('用户诊断:', checkUserResult);
      console.log('活动数据:', activitiesResult?.list || []);

    } catch (error) {
      console.error('加载失败:', error);
      wx.hideLoading();
      this.setData({
        error: error.message
      });
    }
  },

  // 诊断问题
  analyzeIssue: function (currentUserInDb, activities) {
    const issues = [];
    const suggestions = [];

    if (!currentUserInDb) {
      issues.push('未获取到当前用户诊断信息');
      suggestions.push('尝试退出登录后重新登录');
    } else {
      // 检查角色
      if (!currentUserInDb.isLeader && !currentUserInDb.isAdmin) {
        issues.push(`数据库中角色为 "${currentUserInDb.role}"，不是 leader 或 admin`);
        suggestions.push('点击下方"一键修复"按钮修复角色');
      }

      // 检查状态
      if (!currentUserInDb.isApproved) {
        issues.push(`数据库中状态为 "${currentUserInDb.status}"，不是 approved`);
        suggestions.push('点击下方"一键修复"按钮修复状态');
      }

      // 检查权限
      if (!currentUserInDb.hasLeaderPermission) {
        issues.push('没有团长或管理员权限');
        suggestions.push('点击下方"一键修复"按钮设置为团长');
      }
    }

    // 检查活动数据
    if (!activities || activities.length === 0) {
      issues.push('activities 集合为空，没有活动数据');
      suggestions.push('检查 init 云函数是否成功创建了示例数据');
    }

    return {
      hasIssues: issues.length > 0,
      issues,
      suggestions
    };
  },

  // 一键修复用户角色
  async fixUserRole() {
    wx.showLoading({ title: '修复中...' });

    try {
      const result = await debugApi.fixUserRole({});

      wx.hideLoading();

      if (result.code === 0) {
        wx.showModal({
          title: '修复成功',
          content: result.message,
          showCancel: false,
          success: () => {
            // 重新加载数据
            this.loadDbInfo();
            // 刷新 app.globalData
            const app = getApp();
            if (app.globalData.userInfo) {
              app.globalData.userInfo.role = 'leader';
              app.globalData.userInfo.status = 'approved';
              app.updateUserInfo(app.globalData.userInfo);
            }
          }
        });
      } else {
        wx.showModal({
          title: '修复失败',
          content: result.message,
          showCancel: false
        });
      }
    } catch (error) {
      wx.hideLoading();
      wx.showModal({
        title: '修复失败',
        content: error.message,
        showCancel: false
      });
    }
  }
});
