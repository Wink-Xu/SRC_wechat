// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { action, ...data } = event;

  switch (action) {
    case 'login':
      return handleLogin(data, wxContext);
    case 'updateProfile':
      return handleUpdateProfile(data, wxContext);
    case 'applyMembership':
      return handleApplyMembership(data, wxContext);
    case 'getMembers':
      return handleGetMembers(data, wxContext);
    case 'approveMember':
      return handleApproveMember(data, wxContext);
    case 'setRole':
      return handleSetRole(data, wxContext);
    default:
      return { code: -1, message: '未知操作' };
  }
};

// 登录
async function handleLogin(data, wxContext) {
  const openid = wxContext.OPENID;
  const { code } = data;

  try {
    // 查询用户是否存在
    const userResult = await db.collection('users').where({
      openid
    }).get();

    if (userResult.data.length > 0) {
      // 用户已存在
      const user = userResult.data[0];
      return {
        code: 0,
        data: user,
        message: '登录成功'
      };
    }

    // 新用户，创建记录
    const newUser = {
      openid,
      nickname: '微信用户',
      avatar: '',
      phone: '',
      role: 'member',     // 默认设置为团员
      status: 'pending',  // 需要申请审核
      points: 0,
      created_at: db.serverDate(),
      updated_at: db.serverDate()
    };

    const createResult = await db.collection('users').add({
      data: newUser
    });

    newUser._id = createResult._id;

    return {
      code: 0,
      data: newUser,
      message: '登录成功'
    };
  } catch (error) {
    console.error('登录失败', error);
    return { code: -1, message: '登录失败' };
  }
}

// 更新用户资料
async function handleUpdateProfile(data, wxContext) {
  const openid = wxContext.OPENID;
  const { nickname, avatar } = data;

  try {
    await db.collection('users').where({
      openid
    }).update({
      data: {
        nickname: nickname || '',
        avatar: avatar || '',
        updated_at: db.serverDate()
      }
    });

    return { code: 0, message: '更新成功' };
  } catch (error) {
    console.error('更新资料失败', error);
    return { code: -1, message: '更新失败' };
  }
}

// 申请入团
async function handleApplyMembership(data, wxContext) {
  const openid = wxContext.OPENID;
  const { nickname, phone } = data;

  try {
    // 更新用户信息
    await db.collection('users').where({
      openid
    }).update({
      data: {
        nickname,
        phone,
        status: 'pending',
        updated_at: db.serverDate()
      }
    });

    return { code: 0, message: '申请成功，请等待审核' };
  } catch (error) {
    console.error('申请失败', error);
    return { code: -1, message: '申请失败' };
  }
}

// 获取成员列表
async function handleGetMembers(data, wxContext) {
  const { page = 1, limit = 20, status } = data;

  try {
    let query = db.collection('users');

    // 状态筛选
    if (status && status !== 'all') {
      query = query.where({ status });
    }

    // 获取总数
    const countResult = await query.count();
    const total = countResult.total;

    // 分页查询
    const skip = (page - 1) * limit;
    const listResult = await query
      .orderBy('created_at', 'desc')
      .skip(skip)
      .limit(limit)
      .get();

    return {
      code: 0,
      data: {
        list: listResult.data,
        total,
        page,
        limit
      }
    };
  } catch (error) {
    console.error('获取成员列表失败', error);
    return { code: -1, message: '获取失败' };
  }
}

// 审批成员
async function handleApproveMember(data, wxContext) {
  const { userId, action } = data;
  const openid = wxContext.OPENID;

  try {
    // 检查权限
    const adminResult = await db.collection('users').where({
      openid,
      role: _.in(['admin', 'leader'])
    }).get();

    if (adminResult.data.length === 0) {
      return { code: -1, message: '没有权限' };
    }

    // 更新用户状态
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    await db.collection('users').doc(userId).update({
      data: {
        status: newStatus,
        updated_at: db.serverDate()
      }
    });

    return { code: 0, message: action === 'approve' ? '已批准' : '已拒绝' };
  } catch (error) {
    console.error('审批失败', error);
    return { code: -1, message: '审批失败' };
  }
}

// 设置角色
async function handleSetRole(data, wxContext) {
  const { userId, role } = data;
  const openid = wxContext.OPENID;

  try {
    // 检查权限（只有团长可以设置管理员）
    const leaderResult = await db.collection('users').where({
      openid,
      role: 'leader'
    }).get();

    if (leaderResult.data.length === 0) {
      return { code: -1, message: '只有团长可以设置管理员' };
    }

    // 更新用户角色
    await db.collection('users').doc(userId).update({
      data: {
        role,
        updated_at: db.serverDate()
      }
    });

    return { code: 0, message: '设置成功' };
  } catch (error) {
    console.error('设置角色失败', error);
    return { code: -1, message: '设置失败' };
  }
}
