// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// ============================================
// 团长配置 - 将以下 openid 替换为实际团长的微信 openid
// ============================================
const LEADER_OPENID = 'oh2Vh7J6cD2DFe_eQQJ3f2f2BFVM';
// ============================================

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { action, ...data } = event;

  // 获取当前用户 openid
  const openid = wxContext.OPENID;

  switch (action) {
    case 'login':
      return handleLogin(data, wxContext, openid);
    case 'updateProfile':
      return handleUpdateProfile(data, wxContext, openid);
    case 'applyMembership':
      return handleApplyMembership(data, wxContext, openid);
    case 'getMembers':
      return handleGetMembers(data, wxContext, openid);
    case 'approveMember':
      return handleApproveMember(data, wxContext, openid);
    case 'setRole':
      return handleSetRole(data, wxContext, openid);
    case 'kickOut':
      return handleKickOut(data, wxContext, openid);
    case 'cleanupAllData':
      return handleCleanupAllData(data, wxContext, openid);
    default:
      return { code: -1, message: '未知操作' };
  }
};

// 登录
async function handleLogin(data, wxContext, openid) {
  const { code } = data;

  try {
    // 查询用户是否存在
    const userResult = await db.collection('users').where({
      openid
    }).get();

    if (userResult.data.length > 0) {
      // 用户已存在
      const user = userResult.data[0];

      // 检查是否是团长 openid，如果是则自动设置为团长
      if (openid === LEADER_OPENID && LEADER_OPENID !== 'YOUR_LEADER_OPENID_HERE') {
        if (user.role !== 'leader') {
          // 更新为团长
          await db.collection('users').doc(user._id).update({
            data: {
              role: 'leader',
              updated_at: db.serverDate()
            }
          });
          user.role = 'leader';
          console.log('[自动团长] 用户已自动设置为团长:', openid);
        }
      }

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
      role: openid === LEADER_OPENID && LEADER_OPENID !== 'YOUR_LEADER_OPENID_HERE' ? 'leader' : 'member',
      // 团长 openid 直接批准，其他用户是游客状态
      status: openid === LEADER_OPENID && LEADER_OPENID !== 'YOUR_LEADER_OPENID_HERE' ? 'approved' : 'guest',
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
async function handleUpdateProfile(data, wxContext, openid) {
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
async function handleApplyMembership(data, wxContext, openid) {
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
async function handleGetMembers(data, wxContext, openid) {
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
async function handleApproveMember(data, wxContext, openid) {
  const { userId, approveAction } = data;

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
    const newStatus = approveAction === 'approve' ? 'approved' : 'rejected';
    await db.collection('users').doc(userId).update({
      data: {
        status: newStatus,
        updated_at: db.serverDate()
      }
    });

    return { code: 0, message: approveAction === 'approve' ? '已批准' : '已拒绝' };
  } catch (error) {
    console.error('审批失败', error);
    return { code: -1, message: '审批失败' };
  }
}

// 设置角色
async function handleSetRole(data, wxContext, openid) {
  const { userId, role } = data;

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

// 踢出团队（仅团长可用）
async function handleKickOut(data, wxContext, openid) {
  const { userId } = data;

  try {
    // 检查权限（仅团长可操作）
    const leaderResult = await db.collection('users').where({
      openid,
      role: 'leader'
    }).get();

    if (leaderResult.data.length === 0) {
      return { code: -1, message: '只有团长可以操作' };
    }

    // 检查目标用户是否存在且不是团长
    const targetUser = await db.collection('users').doc(userId).get();
    if (!targetUser.data) {
      return { code: -1, message: '用户不存在' };
    }
    if (targetUser.data.role === 'leader') {
      return { code: -1, message: '不能踢出团长' };
    }

    // 删除用户记录
    await db.collection('users').doc(userId).remove();

    console.log('[踢出团队] 已踢出用户:', userId);
    return { code: 0, message: '已踢出团队' };
  } catch (error) {
    console.error('踢出团队失败', error);
    return { code: -1, message: '操作失败' };
  }
}

// 清空所有数据（仅团长可用）
async function handleCleanupAllData(data, wxContext, openid) {
  try {
    // 检查权限（仅团长可操作）
    const leaderResult = await db.collection('users').where({
      openid,
      role: 'leader'
    }).get();

    if (leaderResult.data.length === 0) {
      return { code: -1, message: '只有团长可以操作' };
    }

    // 保存当前用户，清空后恢复
    const currentUser = leaderResult.data[0];
    const currentUserId = currentUser._id;

    const collections = ['activities', 'products', 'orders', 'point_logs'];
    const results = {};

    for (const collection of collections) {
      const coll = db.collection(collection);
      const count = await coll.count();
      const total = count.total;

      if (total > 0) {
        // 分批删除，每批 1000 条
        const batchSize = 1000;
        const batches = Math.ceil(total / batchSize);

        for (let i = 0; i < batches; i++) {
          const batch = await coll.limit(batchSize).skip(i * batchSize).get();
          const deletePromises = batch.data.map(item => coll.doc(item._id).remove());
          await Promise.all(deletePromises);
        }
      }

      results[collection] = { deleted: total };
      console.log(`[清空数据] ${collection}: 删除 ${total} 条`);
    }

    // 删除除当前团长外的所有用户
    const usersToDelete = await db.collection('users')
      .where({
        openid: _.neq(openid)
      })
      .get();

    const deleteUserPromises = usersToDelete.data.map(user =>
      db.collection('users').doc(user._id).remove()
    );
    await Promise.all(deleteUserPromises);

    results.users = { deleted: usersToDelete.data.length, kept: 1 };
    console.log(`[清空数据] users: 删除 ${usersToDelete.data.length} 条，保留 1 条（当前团长）`);

    return {
      code: 0,
      message: '数据已清空',
      data: results
    };
  } catch (error) {
    console.error('清空数据失败', error);
    return { code: -1, message: '清空失败：' + error.message };
  }
}
