// pages/admin-members/admin-members.js
const { userApi } = require('../../utils/request');
const { formatDate, formatPhone, showSuccess, showConfirm, getHighResAvatarUrl } = require('../../utils/util');
const { requireAdmin, isLeader } = require('../../utils/auth');

Page({
  data: {
    members: [],
    loading: true,
    loadingMore: false,
    hasMore: true,
    page: 1,
    pageSize: 20,
    currentStatus: 'all',
    statusTabs: [
      { key: 'all', title: '全部' },
      { key: 'pending', title: '待审批' },
      { key: 'approved', title: '已批准' }
    ],
    isLeader: false
  },

  onLoad: function (options) {
    if (!requireAdmin()) {
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    this.setData({
      isLeader: isLeader(),
      currentStatus: options.status || 'all'
    });

    this.loadMembers();
    this.requestMemberSubscribe();
  },

  // 成员管理订阅通知
  requestMemberSubscribe: function () {
    const hasSubscribed = wx.getStorageSync('admin_member_subscribed');
    if (hasSubscribed) return;
    wx.showModal({
      title: '新成员提醒',
      content: '是否开启新成员申请通知？开启后当有人申请入团时会收到提醒',
      confirmText: '开启',
      cancelText: '暂不',
      success: (res) => {
        if (res.confirm) {
          wx.requestSubscribeMessage({
            tmplIds: ['PPJGcyK4yaRO6FcJFJsrwXoico9heyOdsyBVwjt35-U'],
            success: (res) => {
              if (res.errMsg === 'requestSubscribeMessage:ok' || res['PPJGcyK4yaRO6FcJFJsrwXoico9heyOdsyBVwjt35-U'] === 'accept') {
                wx.setStorageSync('admin_member_subscribed', true);
              }
            },
            fail: (err) => { console.log('订阅授权失败:', err); }
          });
        }
      }
    });
  },

  onPullDownRefresh: function () {
    this.refreshMembers().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom: function () {
    if (this.data.hasMore && !this.data.loadingMore) {
      this.loadMoreMembers();
    }
  },

  // 刷新成员列表
  refreshMembers: async function () {
    this.setData({
      page: 1,
      hasMore: true,
      members: []
    });
    return this.loadMembers();
  },

  // 加载成员列表
  loadMembers: async function () {
    const { page, pageSize, currentStatus } = this.data;

    try {
      const params = { page, limit: pageSize };
      if (currentStatus !== 'all') {
        params.status = currentStatus;
      }

      const result = await userApi.getMembers(params);

      // 收集需要转换的头像 fileID
      const rawMembers = result.list || [];
      const avatarFileIDs = rawMembers
        .filter(item => item.avatar && item.avatar.startsWith('cloud://'))
        .map(item => item.avatar);

      // 批量转换 fileID 为临时 URL
      let tempUrlMap = {};
      if (avatarFileIDs.length > 0) {
        try {
          const tempUrlResult = await wx.cloud.getTempFileURL({
            fileList: avatarFileIDs
          });
          tempUrlResult.fileList.forEach(file => {
            tempUrlMap[file.fileID] = file.tempFileURL;
          });
        } catch (err) {
          console.error('获取头像临时链接失败', err);
        }
      }

      const members = rawMembers.map(item => {
        const processed = {
          ...item,
          formattedTime: formatDate(item.created_at, 'YYYY-MM-DD'),
          formattedPhone: item.phone || '',  // 管理员页面直接显示完整手机号
          roleText: this.getRoleText(item.role)
        };
        // 转换头像
        if (item.avatar && item.avatar.startsWith('cloud://') && tempUrlMap[item.avatar]) {
          processed.displayAvatar = tempUrlMap[item.avatar];
        }
        return processed;
      });

      this.setData({
        members: page === 1 ? members : [...this.data.members, ...members],
        hasMore: members.length >= pageSize,
        loading: false
      });
    } catch (error) {
      console.error('加载成员列表失败', error);
      this.setData({ loading: false });
    }
  },

  // 加载更多
  loadMoreMembers: async function () {
    this.setData({
      loadingMore: true,
      page: this.data.page + 1
    });

    try {
      await this.loadMembers();
    } finally {
      this.setData({ loadingMore: false });
    }
  },

  // 切换状态
  onTabChange: function (e) {
    const { key } = e.currentTarget.dataset;
    this.setData({
      currentStatus: key,
      members: [],
      page: 1,
      hasMore: true
    });
    this.loadMembers();
  },

  // 批准申请
  handleApprove: async function (e) {
    const { id } = e.currentTarget.dataset;

    const confirm = await showConfirm('批准申请', '确定要批准该成员的入团申请吗？');
    if (!confirm) return;

    try {
      await userApi.approveMember({ userId: id, approveAction: 'approve' });
      showSuccess('已批准');
      this.refreshMembers();
    } catch (error) {
      console.error('批准失败', error);
    }
  },

  // 拒绝申请
  handleReject: async function (e) {
    const { id } = e.currentTarget.dataset;

    const confirm = await showConfirm('拒绝申请', '确定要拒绝该成员的入团申请吗？');
    if (!confirm) return;

    try {
      await userApi.approveMember({ userId: id, approveAction: 'reject' });
      showSuccess('已拒绝');
      this.refreshMembers();
    } catch (error) {
      console.error('拒绝失败', error);
    }
  },

  // 设置角色（团长专用）
  handleSetRole: async function (e) {
    if (!this.data.isLeader) return;

    const { id, role } = e.currentTarget.dataset;

    // 创建角色选择菜单
    const roles = [
      { value: 'member', label: '团员' },
      { value: 'activity_admin', label: '活动管理员' },
      { value: 'coffee_admin', label: '咖啡管理员' }
    ];

    const currentRoleIndex = roles.findIndex(r => r.value === role);
    const items = roles.map(r => r.label);

    wx.showActionSheet({
      itemList: items,
      success: async (res) => {
        const selectedRole = roles[res.tapIndex].value;
        const selectedLabel = roles[res.tapIndex].label;

        const confirm = await showConfirm('设置角色', `确定要将该用户设置为"${selectedLabel}"吗？`);
        if (!confirm) return;

        try {
          await userApi.setRole({ userId: id, role: selectedRole });
          showSuccess('设置成功');
          this.refreshMembers();
        } catch (error) {
          console.error('设置角色失败', error);
          wx.showToast({ title: error.message || '设置失败', icon: 'none' });
        }
      }
    });
  },

  // 踢出团队
  handleKickOut: async function (e) {
    const { id } = e.currentTarget.dataset;

    const confirm = await showConfirm('踢出团队', '确定要将该成员踢出团队吗？此操作不可恢复。');
    if (!confirm) return;

    try {
      await userApi.kickOut({ userId: id });
      showSuccess('已踢出团队');
      this.refreshMembers();
    } catch (error) {
      console.error('踢出失败', error);
    }
  },

  // 获取角色文本
  getRoleText: function (role) {
    const roleMap = {
      member: '团员',
      activity_admin: '活动管理员',
      coffee_admin: '咖啡管理员',
      leader: '团长'
    };
    return roleMap[role] || role;
  },

  // 预览成员头像
  previewAvatar: function (e) {
    const { index } = e.currentTarget.dataset;
    const members = this.data.members;
    const avatarUrls = members
      .filter(m => m.displayAvatar || m.avatar)
      .map(m => getHighResAvatarUrl(m.displayAvatar || m.avatar));

    if (avatarUrls.length > 0) {
      const currentAvatar = getHighResAvatarUrl(members[index]?.displayAvatar || members[index]?.avatar || avatarUrls[0]);
      wx.previewImage({
        current: currentAvatar,
        urls: avatarUrls
      });
    }
  }
});