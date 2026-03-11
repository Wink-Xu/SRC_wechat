// pages/admin-members/admin-members.js
const { userApi } = require('../../utils/request');
const { formatDate, formatPhone, showSuccess, showConfirm } = require('../../utils/util');
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

      const members = (result.list || []).map(item => ({
        ...item,
        formattedTime: formatDate(item.created_at, 'YYYY-MM-DD'),
        formattedPhone: formatPhone(item.phone),
        roleText: this.getRoleText(item.role)
      }));

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
      await userApi.approveMember({ userId: id, action: 'approve' });
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
      await userApi.approveMember({ userId: id, action: 'reject' });
      showSuccess('已拒绝');
      this.refreshMembers();
    } catch (error) {
      console.error('拒绝失败', error);
    }
  },

  // 设置管理员
  handleSetAdmin: async function (e) {
    if (!this.data.isLeader) return;

    const { id, role } = e.currentTarget.dataset;
    const newRole = role === 'admin' ? 'member' : 'admin';
    const actionText = newRole === 'admin' ? '设为管理员' : '取消管理员';

    const confirm = await showConfirm(actionText, `确定要${actionText}吗？`);
    if (!confirm) return;

    try {
      await userApi.setRole({ userId: id, role: newRole });
      showSuccess('操作成功');
      this.refreshMembers();
    } catch (error) {
      console.error('设置失败', error);
    }
  },

  // 获取角色文本
  getRoleText: function (role) {
    const roleMap = {
      member: '团员',
      admin: '管理员',
      leader: '团长'
    };
    return roleMap[role] || role;
  }
});