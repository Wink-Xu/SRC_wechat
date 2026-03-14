// utils/request.js - 云函数请求封装

const { showLoading, hideLoading, showError } = require('./util');

// Mock 模式开关：true=使用本地模拟数据，false=使用云函数
const USE_MOCK = true;

// 模拟数据
let mockData = null;
if (USE_MOCK) {
  mockData = require('./mock-data');
}

/**
 * 调用云函数
 * @param {string} name 云函数名称
 * @param {string} action 方法名
 * @param {Object} data 参数
 * @param {Object} options 配置选项
 * @returns {Promise<Object>} 返回结果
 */
const callFunction = async (name, action, data = {}, options = {}) => {
  // Mock 模式：直接返回模拟数据
  if (USE_MOCK) {
    // 每次都重新获取 mockData，确保数据是最新的
    mockData = require('./mock-data');
    const result = await handleMockApi(name, action, data, options);
    return result.data; // 与非 Mock 模式保持一致，返回 .data
  }

  const { showLoad = true, showErrorMsg = true } = options;

  if (showLoad) {
    showLoading();
  }

  try {
    const res = await wx.cloud.callFunction({
      name,
      data: {
        action,
        ...data
      }
    });

    if (showLoad) {
      hideLoading();
    }

    const result = res.result;

    if (result.code !== 0) {
      if (showErrorMsg) {
        showError(result.message || '请求失败');
      }
      return Promise.reject(result);
    }

    return result.data;
  } catch (error) {
    if (showLoad) {
      hideLoading();
    }

    console.error(`云函数调用失败: ${name}.${action}`, error);

    if (showErrorMsg) {
      showError(error.message || '网络错误，请重试');
    }

    return Promise.reject(error);
  }
};

/**
 * Mock 模式 API 处理
 */
const handleMockApi = async (name, action, data = {}, options = {}) => {
  console.log(`[Mock API] ${name}.${action}`, data);

  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 300));

  switch (name) {
    case 'user':
      return handleUserMock(action, data);
    case 'activity':
      return handleActivityMock(action, data);
    case 'points':
      return handlePointsMock(action, data);
    case 'shop':
      return handleShopMock(action, data);
    case 'admin':
      return handleAdminMock(action, data);
    default:
      return { code: 0, data: null };
  }
};

// 用户相关 Mock API
const handleUserMock = (action, data) => {
  switch (action) {
    case 'login':
      return Promise.resolve({ code: 0, data: mockData.currentUser });
    case 'updateProfile':
      return Promise.resolve({ code: 0, data: { ...mockData.currentUser, ...data } });
    case 'applyMembership':
      return Promise.resolve({ code: 0, data: { ...mockData.currentUser, status: 'pending' } });
    case 'getMembers':
      return Promise.resolve({ code: 0, data: { list: mockData.members } });
    case 'approveMember':
      return Promise.resolve({ code: 0, data: { success: true } });
    case 'setRole':
      return Promise.resolve({ code: 0, data: { success: true } });
    default:
      return Promise.resolve({ code: 0, data: null });
  }
};

// 活动相关 Mock API
let activityIdCounter = 100; // 用于生成新活动 ID

// 报名记录：key=activityId_userId, value=registration 对象
const registrations = {};

// 检查是否已报名
const isRegistered = (activityId, userId) => {
  const key = `${activityId}_${userId}`;
  return registrations[key] || null;
};

// 添加报名记录
const addRegistration = (activityId, userId) => {
  const key = `${activityId}_${userId}`;
  registrations[key] = {
    _id: `reg_${Date.now()}`,
    activity_id: activityId,
    user_id: userId,
    status: 'registered',
    check_in_status: 'pending', // 签到状态：pending, checked_in
    check_in_time: null,        // 签到时间
    points_awarded: false,      // 是否已发放积分
    created_at: new Date().toISOString()
  };
  return registrations[key];
};

// 取消报名记录
const removeRegistration = (activityId, userId) => {
  const key = `${activityId}_${userId}`;
  if (registrations[key]) {
    delete registrations[key];
    return true;
  }
  return false;
};

const handleActivityMock = (action, data) => {
  switch (action) {
    case 'getList': {
      // 过滤活动列表
      let filteredActivities = [...mockData.activities];

      console.log('[Mock getList] 原始活动数量:', mockData.activities.length);
      console.log('[Mock getList] 过滤参数:', data);
      console.log('[Mock getList] 当前用户 ID:', mockData.currentUser._id);

      // 如果 all=true，不过滤状态（用于管理后台）
      if (!data.all) {
        // 按创建者过滤（我创建的）
        if (data.createdByMe) {
          const beforeCount = filteredActivities.length;
          filteredActivities = filteredActivities.filter(
            a => a.created_by === mockData.currentUser._id
          );
          console.log('[Mock getList] 按创建者过滤后数量:', filteredActivities.length, '(原始:', beforeCount + ')');
        }

        // 按状态过滤
        if (data.status) {
          const beforeCount = filteredActivities.length;
          filteredActivities = filteredActivities.filter(a => a.status === data.status);
          console.log('[Mock getList] 按状态过滤后数量:', filteredActivities.length, '(原始:', beforeCount + ', 状态:', data.status + ')');
        }

        // 按报名状态过滤（我报名的）
        if (data.registered) {
          filteredActivities = filteredActivities.filter(a => a.isRegistered);
        }
      } else {
        console.log('[Mock getList] all=true，返回所有活动');
      }

      return Promise.resolve({ code: 0, data: { list: filteredActivities } });
    }
    case 'getDetail':
      const activity = mockData.activities.find(a => a._id === data.id);
      const userId = mockData.currentUser._id;

      // 检查当前用户是否已报名
      const userRegistration = isRegistered(data.id, userId);

      // 生成模拟参与者数据（从成员列表中选取）
      const registeredCount = activity?.registered_count || 0;
      const mockParticipants = mockData.members
        .filter(m => m.status === 'approved') // 只选择正式成员
        .slice(0, registeredCount)
        .map((m, index) => ({
          _id: m._id,
          nickname: m.nickname,
          avatar: m.avatar || '/images/default-avatar.png',
          phone: m.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
          status: index < 2 ? 'checked_in' : 'registered' // 前 2 个已签到，其余已报名
        }));

      return Promise.resolve({
        code: 0,
        data: activity ? {
          activity,
          isRegistered: !!userRegistration,
          registration: userRegistration,
          participants: mockParticipants
        } : {
          activity: mockData.activities[0],
          isRegistered: false,
          registration: null,
          participants: []
        }
      });
    case 'create':
      // 创建新活动并添加到列表
      const newActivity = {
        _id: 'activity_' + (++activityIdCounter),
        title: data.title,
        description: data.description || '',
        location: data.location,
        run_type: data.run_type || 'road',
        dress_code: data.dress_code || '',
        start_time: data.start_time,
        end_time: data.end_time,
        registration_deadline: data.registration_deadline,
        quota: data.quota,
        points: data.points,
        status: 'published', // 新建活动自动发布
        registered_count: 0,
        created_by: mockData.currentUser._id
      };
      mockData.activities.unshift(newActivity); // 添加到列表开头
      console.log('[Mock] 创建了新活动:', newActivity);
      return Promise.resolve({ code: 0, data: { success: true, activity: newActivity } });
    case 'update':
      const index = mockData.activities.findIndex(a => a._id === data.id);
      if (index !== -1) {
        mockData.activities[index] = { ...mockData.activities[index], ...data };
      }
      return Promise.resolve({ code: 0, data: { success: true } });
    case 'publish':
      const pubIndex = mockData.activities.findIndex(a => a._id === data.id);
      if (pubIndex !== -1) {
        mockData.activities[pubIndex].status = 'published';
      }
      return Promise.resolve({ code: 0, data: { success: true } });
    case 'cancel':
      const cancelIndex = mockData.activities.findIndex(a => a._id === data.id);
      if (cancelIndex !== -1) {
        mockData.activities[cancelIndex].status = 'cancelled';
      }
      return Promise.resolve({ code: 0, data: { success: true } });
    case 'delete':
      const deleteIndex = mockData.activities.findIndex(a => a._id === data.id);
      if (deleteIndex !== -1) {
        mockData.activities.splice(deleteIndex, 1);
        console.log('[Mock] 删除了活动:', data.id);
      }
      return Promise.resolve({ code: 0, data: { success: true } });
    case 'register': {
      const userId = mockData.currentUser._id;
      const activityId = data.activityId;

      // 检查是否已报名
      const existingReg = isRegistered(activityId, userId);
      if (existingReg) {
        return Promise.resolve({ code: 1, message: '您已报名过此活动', data: null });
      }

      // 检查活动是否存在和名额
      const activity = mockData.activities.find(a => a._id === activityId);
      if (!activity) {
        return Promise.resolve({ code: 1, message: '活动不存在', data: null });
      }
      if (activity.registered_count >= activity.quota) {
        return Promise.resolve({ code: 1, message: '名额已满', data: null });
      }

      // 添加报名记录
      addRegistration(activityId, userId);

      // 增加报名人数
      const regIndex = mockData.activities.findIndex(a => a._id === activityId);
      if (regIndex !== -1) {
        mockData.activities[regIndex].registered_count = (mockData.activities[regIndex].registered_count || 0) + 1;
      }

      console.log('[Mock] 用户报名:', { activityId, userId });
      return Promise.resolve({ code: 0, data: { success: true } });
    }
    case 'cancelRegistration': {
      const userId = mockData.currentUser._id;
      const activityId = data.activityId;

      // 检查是否已报名
      const existingReg = isRegistered(activityId, userId);
      if (!existingReg) {
        return Promise.resolve({ code: 1, message: '您未报名此活动', data: null });
      }

      // 取消报名记录
      removeRegistration(activityId, userId);

      // 减少报名人数
      const cancelRegIndex = mockData.activities.findIndex(a => a._id === activityId);
      if (cancelRegIndex !== -1 && mockData.activities[cancelRegIndex].registered_count > 0) {
        mockData.activities[cancelRegIndex].registered_count--;
      }

      console.log('[Mock] 用户取消报名:', { activityId, userId });
      return Promise.resolve({ code: 0, data: { success: true } });
    }
    case 'checkIn': {
      const userId = mockData.currentUser._id;
      const activityId = data.activityId;

      // 检查是否已报名
      const existingReg = isRegistered(activityId, userId);
      if (!existingReg) {
        return Promise.resolve({ code: 1, message: '请先报名参加活动', data: null });
      }

      // 检查是否已签到
      if (existingReg.check_in_status === 'checked_in') {
        return Promise.resolve({ code: 1, message: '您已签到，无需重复操作', data: null });
      }

      // 更新签到状态
      existingReg.check_in_status = 'checked_in';
      existingReg.check_in_time = new Date().toISOString();

      // 更新活动签到人数
      const activity = mockData.activities.find(a => a._id === activityId);
      if (activity) {
        activity.check_in_count = (activity.check_in_count || 0) + 1;
      }

      console.log('[Mock] 用户签到成功:', { activityId, userId });
      return Promise.resolve({ code: 0, data: { success: true } });
    }
    case 'getCheckInQrCode': {
      // 生成模拟二维码数据
      const activity = mockData.activities.find(a => a._id === data.id);
      if (!activity) {
        return Promise.resolve({ code: 1, message: '活动不存在', data: null });
      }

      const qrData = {
        activity_id: data.id,
        qr_code: `data:image/png;base64,simulated_qr_${data.id}`,
        check_in_count: activity.check_in_count || 0
      };
      return Promise.resolve({ code: 0, data: qrData });
    }
    case 'finishActivityWithCheckIn': {
      const activity = mockData.activities.find(a => a._id === data.id);
      if (!activity) {
        return Promise.resolve({ code: 1, message: '活动不存在', data: null });
      }

      // 更新活动状态
      activity.status = 'ended';

      // 给所有已签到的用户发放积分
      const pointsToAward = activity.points || 20;
      let awardedCount = 0;

      // 遍历所有报名记录
      Object.values(registrations).forEach(reg => {
        if (reg.activity_id === data.id && reg.check_in_status === 'checked_in' && !reg.points_awarded) {
          reg.points_awarded = true;
          awardedCount++;
        }
      });

      console.log('[Mock] 结束活动并发放积分:', { activityId: data.id, awardedCount, points: pointsToAward });
      return Promise.resolve({
        code: 0,
        data: {
          success: true,
          awarded_count: awardedCount,
          points_per_person: pointsToAward
        }
      });
    }
    default:
      return Promise.resolve({ code: 0, data: null });
  }
};

// 积分相关 Mock API
const handlePointsMock = (action, data) => {
  switch (action) {
    case 'getBalance':
      return Promise.resolve({ code: 0, data: { points: mockData.currentUser.points } });
    case 'getLogs':
      return Promise.resolve({ code: 0, data: { list: mockData.pointLogs } });
    case 'getRanking':
      return Promise.resolve({ code: 0, data: { list: mockData.ranking } });
    case 'addPoints':
    case 'deductPoints':
      return Promise.resolve({ code: 0, data: { success: true } });
    default:
      return Promise.resolve({ code: 0, data: null });
  }
};

// 商城相关 Mock API
const handleShopMock = (action, data) => {
  switch (action) {
    case 'getProductList':
      return Promise.resolve({ code: 0, data: { list: mockData.products } });
    case 'getProductDetail': {
      const product = mockData.products.find(p => p._id === data.id);
      return Promise.resolve({
        code: 0,
        data: {
          product: product || mockData.products[0],
          myPoints: mockData.currentUser.points
        }
      });
    }
    case 'createOrder':
      return Promise.resolve({ code: 0, data: { orderId: 'mock_order_' + Date.now() } });
    case 'payOrderByPoints':
    case 'payOrderByWechat':
      return Promise.resolve({ code: 0, data: { success: true } });
    case 'getOrders':
      return Promise.resolve({ code: 0, data: { list: [] } });
    case 'getOrderDetail':
      return Promise.resolve({ code: 0, data: {} });
    case 'cancelOrder':
    case 'confirmReceipt':
      return Promise.resolve({ code: 0, data: { success: true } });
    default:
      return Promise.resolve({ code: 0, data: null });
  }
};

// 管理后台 Mock API
const handleAdminMock = (action, data) => {
  switch (action) {
    case 'getStatistics':
      return Promise.resolve({
        code: 0,
        data: {
          memberCount: mockData.members.filter(m => m.status === 'approved').length,
          pendingCount: mockData.members.filter(m => m.status === 'pending').length,
          activityCount: mockData.activities.length,
          orderCount: 0
        }
      });
    case 'getPendingMembers':
      return Promise.resolve({
        code: 0,
        data: { list: mockData.members.filter(m => m.status === 'pending') }
      });
    case 'manageProduct':
    case 'updateOrderStatus':
      return Promise.resolve({ code: 0, data: { success: true } });
    case 'getOrders':
      return Promise.resolve({ code: 0, data: { list: [] } });
    default:
      return Promise.resolve({ code: 0, data: null });
  }
};

// 用户相关接口
const userApi = {
  login: (data) => callFunction('user', 'login', data),
  updateProfile: (data) => callFunction('user', 'updateProfile', data),
  applyMembership: (data) => callFunction('user', 'applyMembership', data),
  getMembers: (data) => callFunction('user', 'getMembers', data),
  approveMember: (data) => callFunction('user', 'approveMember', data),
  setRole: (data) => callFunction('user', 'setRole', data)
};

// 活动相关接口
const activityApi = {
  create: (data) => callFunction('activity', 'create', data),
  update: (data) => callFunction('activity', 'update', data),
  publish: (data) => callFunction('activity', 'publish', data),
  cancel: (data) => callFunction('activity', 'cancel', data),
  delete: (data) => callFunction('activity', 'delete', data),
  getList: (data) => callFunction('activity', 'getList', data, { showLoad: false }),
  getDetail: (data) => callFunction('activity', 'getDetail', data),
  register: (data) => callFunction('activity', 'register', data),
  cancelRegistration: (data) => callFunction('activity', 'cancelRegistration', data),
  checkIn: (data) => callFunction('activity', 'checkIn', data),
  getCheckInQrCode: (data) => callFunction('activity', 'getCheckInQrCode', data, { showLoad: false }),
  finishActivityWithCheckIn: (data) => callFunction('activity', 'finishActivityWithCheckIn', data)
};

// 积分相关接口
const pointsApi = {
  getBalance: (data) => callFunction('points', 'getBalance', data, { showLoad: false }),
  getLogs: (data) => callFunction('points', 'getLogs', data, { showLoad: false }),
  getRanking: (data) => callFunction('points', 'getRanking', data, { showLoad: false }),
  addPoints: (data) => callFunction('points', 'addPoints', data),
  deductPoints: (data) => callFunction('points', 'deductPoints', data)
};

// 商城相关接口
const shopApi = {
  getProductList: (data) => callFunction('shop', 'getProductList', data, { showLoad: false }),
  getProductDetail: (data) => callFunction('shop', 'getProductDetail', data),
  createOrder: (data) => callFunction('shop', 'createOrder', data),
  payOrderByPoints: (data) => callFunction('shop', 'payOrderByPoints', data),
  payOrderByWechat: (data) => callFunction('shop', 'payOrderByWechat', data),
  getOrders: (data) => callFunction('shop', 'getOrders', data, { showLoad: false }),
  getOrderDetail: (data) => callFunction('shop', 'getOrderDetail', data),
  cancelOrder: (data) => callFunction('shop', 'cancelOrder', data),
  confirmReceipt: (data) => callFunction('shop', 'confirmReceipt', data)
};

// 管理后台接口
const adminApi = {
  getStatistics: (data) => callFunction('admin', 'getStatistics', data),
  getPendingMembers: (data) => callFunction('admin', 'getPendingMembers', data),
  manageProduct: (data) => callFunction('admin', 'manageProduct', data),
  updateOrderStatus: (data) => callFunction('admin', 'updateOrderStatus', data),
  getOrders: (data) => callFunction('admin', 'getOrders', data, { showLoad: false })
};

module.exports = {
  callFunction,
  userApi,
  activityApi,
  pointsApi,
  shopApi,
  adminApi
};