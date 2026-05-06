// pages/profile/profile.js
const { userApi, pointsApi, activityApi, adminApi } = require('../../utils/request');
const { formatPhone, showSuccess, showConfirm, showInfo } = require('../../utils/util');
const app = getApp();

Page({
  data: {
    userInfo: null,
    isLoggedIn: false,
    isAdmin: false,
    isLeader: false,
    isActivityAdmin: false,   // 活动管理员
    isCoffeeAdmin: false,     // 咖啡管理员
    isMember: false,    // 是否是团员（已批准）
    isPending: false,   // 是否待审批
    points: 0,
    activityCount: 0,
    pendingMembersCount: 0  // 待审核成员数量
  },

  onLoad: function () {
    // 初始状态
  },

  onShow: function () {
    this.refreshUserInfo(true);
  },

  // 刷新用户信息
  refreshUserInfo: async function (shouldRefreshStatus) {
    const app = getApp();
    const isLoggedIn = app.globalData.isLoggedIn;

    // 先从服务器刷新用户状态（解决审核通过后需要重新登录的问题）
    if (shouldRefreshStatus && isLoggedIn) {
      await app.refreshUserStatus();
    }

    let userInfo = app.globalData.userInfo;

    // 处理头像：如果是 cloud:// 开头，需要转换为临时 URL
    if (userInfo && userInfo.avatar && userInfo.avatar.startsWith('cloud://')) {
      try {
        const tempUrlResult = await wx.cloud.getTempFileURL({
          fileList: [userInfo.avatar]
        });
        if (tempUrlResult.fileList[0]?.tempURL) {
          userInfo = { ...userInfo, displayAvatar: tempUrlResult.fileList[0].tempURL };
        }
      } catch (err) {
        console.error('获取头像临时链接失败', err);
      }
    } else if (userInfo && userInfo.avatar) {
      userInfo = { ...userInfo, displayAvatar: userInfo.avatar };
    }

    const role = userInfo?.role || '';

    this.setData({
      isLoggedIn,
      userInfo,
      isAdmin: app.globalData.isAdmin,
      isLeader: app.globalData.isLeader,
      isActivityAdmin: role === 'activity_admin' || role === 'leader',
      isCoffeeAdmin: role === 'coffee_admin' || role === 'leader',
      isMember: app.globalData.isMember,
      isPending: userInfo && userInfo.status === 'pending'
    });

    // 获取积分和活动次数（仅团员）
    if (isLoggedIn && app.globalData.isMember) {
      try {
        // 并行获取积分和活动次数
        const [pointsResult, activityResult] = await Promise.all([
          pointsApi.getBalance(),
          activityApi.getList({ registered: true })
        ]);

        const activities = activityResult.list || [];
        const checkedInCount = activities.filter(activity => activity.user_checked_in).length;

        this.setData({
          points: pointsResult.points || 0,
          activityCount: checkedInCount
        });
      } catch (error) {
        console.error('获取积分失败', error);
        this.setData({
          points: 0,
          activityCount: 0
        });
      }
    }

    // 获取待审核成员数量（仅活动管理员/团长）
    if (isLoggedIn && (app.globalData.isLeader || app.globalData.userInfo?.role === 'activity_admin')) {
      try {
        const pendingResult = await adminApi.getPendingMembers({});
        this.setData({
          pendingMembersCount: pendingResult.list?.length || 0
        });
      } catch (error) {
        console.error('获取待审核成员失败', error);
      }
    }
  },

  // 微信授权登录
  handleLogin: async function () {
    try {
      const app = getApp();
      await app.handleLogin();

      // 登录成功，刷新页面
      this.refreshUserInfo();

      wx.showToast({
        title: '登录成功',
        icon: 'success'
      });
    } catch (error) {
      console.error('登录失败', error);
      if (error.errMsg && error.errMsg.includes('auth deny')) {
        // 用户拒绝授权
        wx.showToast({
          title: '你已拒绝授权',
          icon: 'none'
        });
      } else {
        wx.showToast({
          title: '登录失败，请重试',
          icon: 'none'
        });
      }
    }
  },

  // 跳转到申请入团页面
  goToApply: function () {
    wx.navigateTo({
      url: '/pages/apply-membership/apply-membership'
    });
  },

  // 编辑昵称
  editNickname: function () {
    const that = this;
    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: this.data.userInfo?.nickname || '请输入昵称',
      success: async function (res) {
        if (res.confirm && res.content) {
          const newNickname = res.content.trim();
          if (!newNickname) {
            wx.showToast({ title: '昵称不能为空', icon: 'none' });
            return;
          }

          try {
            await userApi.updateProfile({ nickname: newNickname });

            // 更新本地数据
            const app = getApp();
            if (app.globalData.userInfo) {
              app.globalData.userInfo.nickname = newNickname;
              wx.setStorageSync('userInfo', app.globalData.userInfo);
            }

            that.setData({
              'userInfo.nickname': newNickname
            });

            showSuccess('昵称已更新');
          } catch (error) {
            console.error('更新昵称失败', error);
            wx.showToast({ title: '更新失败', icon: 'none' });
          }
        }
      }
    });
  },

  // 跳转到我的活动页面
  goToMyActivities: function () {
    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    wx.navigateTo({
      url: '/pages/my-activities/my-activities'
    });
  },

  // 跳转到积分详情页面
  goToPoints: function () {
    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    wx.navigateTo({
      url: '/pages/points/points'
    });
  },

  // 跳转到我的订单页面（需要登录）
  goToOrders: function () {
    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    wx.navigateTo({
      url: '/pages/orders/orders'
    });
  },

  // 跳转到页面（需要登录）
  goToPage: function (e) {
    const { path } = e.currentTarget.dataset;

    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    wx.navigateTo({ url: path });
  },

  // 退出登录
  handleLogout: async function () {
    const confirm = await showConfirm('退出登录', '确定要退出登录吗？');
    if (!confirm) return;

    const app = getApp();
    app.clearUserInfo();

    this.setData({
      isLoggedIn: false,
      userInfo: null,
      points: 0,
      activityCount: 0
    });

    showSuccess('已退出登录');
  },

  // 预览头像
  previewAvatar: function () {
    const avatar = this.data.userInfo?.displayAvatar || this.data.userInfo?.avatar;
    if (avatar) {
      wx.previewImage({
        current: avatar,
        urls: [avatar]
      });
    }
  },

  // 修改头像
  changeAvatar: async function () {
    const that = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['original'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        const tempFile = res.tempFiles[0];
        if (!tempFile) return;

        // 显示封面调整器
        that.avatarAdjuster = that.selectComponent('#avatarAdjuster');
        that.avatarAdjuster.show(tempFile.tempFilePath);
      },
      fail: function (err) {
        console.error('选择图片失败', err);
      }
    });
  },

  // 头像裁剪确认
  onAvatarConfirm: async function (e) {
    const self = this;
    const { tempFilePath } = e.detail;

    wx.showLoading({ title: '上传中...' });

    try {
      // 上传头像到云存储
      const cloudPath = `user_avatars/${self.data.userInfo._id || Date.now()}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
      const uploadRes = await new Promise((resolve, reject) => {
        wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: tempFilePath,
          isPrivate: false,
          success: resolve,
          fail: reject
        });
      });

      // 更新用户头像
      await userApi.updateProfile({
        avatar: uploadRes.fileID
      });

      // 更新全局用户信息
      const app = getApp();
      if (app.globalData.userInfo) {
        app.globalData.userInfo.avatar = uploadRes.fileID;
      }

      wx.hideLoading();
      showSuccess('头像更新成功');

      // 刷新页面
      self.refreshUserInfo();
    } catch (error) {
      wx.hideLoading();
      console.error('更新头像失败', error);
      wx.showToast({
        title: '更新失败',
        icon: 'none'
      });
    }
  },

  // 头像裁剪取消
  onAvatarCancel: function () {
    // 用户取消
  }
});
