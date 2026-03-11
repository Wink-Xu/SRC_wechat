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
    case 'create':
      return handleCreate(data, wxContext);
    case 'update':
      return handleUpdate(data, wxContext);
    case 'publish':
      return handlePublish(data, wxContext);
    case 'cancel':
      return handleCancel(data, wxContext);
    case 'getList':
      return handleGetList(data, wxContext);
    case 'getDetail':
      return handleGetDetail(data, wxContext);
    case 'register':
      return handleRegister(data, wxContext);
    case 'cancelRegistration':
      return handleCancelRegistration(data, wxContext);
    case 'checkIn':
      return handleCheckIn(data, wxContext);
    default:
      return { code: -1, message: '未知操作' };
  }
};

// 创建活动
async function handleCreate(data, wxContext) {
  const openid = wxContext.OPENID;

  try {
    // 检查权限
    const userResult = await db.collection('users').where({
      openid,
      role: _.in(['admin', 'leader'])
    }).get();

    if (userResult.data.length === 0) {
      return { code: -1, message: '没有权限' };
    }

    const activity = {
      ...data,
      status: 'draft',
      created_by: userResult.data[0]._id,
      registered_count: 0,
      created_at: db.serverDate(),
      updated_at: db.serverDate()
    };

    const result = await db.collection('activities').add({
      data: activity
    });

    return {
      code: 0,
      data: { id: result._id },
      message: '创建成功'
    };
  } catch (error) {
    console.error('创建活动失败', error);
    return { code: -1, message: '创建失败' };
  }
}

// 更新活动
async function handleUpdate(data, wxContext) {
  const openid = wxContext.OPENID;
  const { id, ...updateData } = data;

  try {
    // 检查权限
    const userResult = await db.collection('users').where({
      openid,
      role: _.in(['admin', 'leader'])
    }).get();

    if (userResult.data.length === 0) {
      return { code: -1, message: '没有权限' };
    }

    await db.collection('activities').doc(id).update({
      data: {
        ...updateData,
        updated_at: db.serverDate()
      }
    });

    return { code: 0, message: '更新成功' };
  } catch (error) {
    console.error('更新活动失败', error);
    return { code: -1, message: '更新失败' };
  }
}

// 发布活动
async function handlePublish(data, wxContext) {
  const openid = wxContext.OPENID;
  const { id } = data;

  try {
    // 检查权限
    const userResult = await db.collection('users').where({
      openid,
      role: _.in(['admin', 'leader'])
    }).get();

    if (userResult.data.length === 0) {
      return { code: -1, message: '没有权限' };
    }

    await db.collection('activities').doc(id).update({
      data: {
        status: 'published',
        updated_at: db.serverDate()
      }
    });

    return { code: 0, message: '发布成功' };
  } catch (error) {
    console.error('发布活动失败', error);
    return { code: -1, message: '发布失败' };
  }
}

// 取消活动
async function handleCancel(data, wxContext) {
  const openid = wxContext.OPENID;
  const { id } = data;

  try {
    // 检查权限
    const userResult = await db.collection('users').where({
      openid,
      role: _.in(['admin', 'leader'])
    }).get();

    if (userResult.data.length === 0) {
      return { code: -1, message: '没有权限' };
    }

    await db.collection('activities').doc(id).update({
      data: {
        status: 'cancelled',
        updated_at: db.serverDate()
      }
    });

    return { code: 0, message: '活动已取消' };
  } catch (error) {
    console.error('取消活动失败', error);
    return { code: -1, message: '取消失败' };
  }
}

// 获取活动列表
async function handleGetList(data, wxContext) {
  const openid = wxContext.OPENID;
  const { page = 1, limit = 10, status, registered, createdByMe, all } = data;

  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({ openid }).get();
    const userId = userResult.data.length > 0 ? userResult.data[0]._id : null;

    let query = db.collection('activities');

    // 状态筛选
    if (status) {
      query = query.where({ status });
    }

    // 我报名的活动
    if (registered && userId) {
      const regResult = await db.collection('registrations').where({
        user_id: userId,
        status: 'registered'
      }).get();

      const activityIds = regResult.data.map(r => r.activity_id);
      query = query.where({
        _id: _.in(activityIds)
      });
    }

    // 我创建的活动
    if (createdByMe && userId) {
      query = query.where({ created_by: userId });
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
    console.error('获取活动列表失败', error);
    return { code: -1, message: '获取失败' };
  }
}

// 获取活动详情
async function handleGetDetail(data, wxContext) {
  const openid = wxContext.OPENID;
  const { id } = data;

  try {
    // 获取活动
    const activityResult = await db.collection('activities').doc(id).get();
    const activity = activityResult.data;

    // 获取当前用户
    const userResult = await db.collection('users').where({ openid }).get();
    const userId = userResult.data.length > 0 ? userResult.data[0]._id : null;

    // 检查是否已报名
    let isRegistered = false;
    let registration = null;

    if (userId) {
      const regResult = await db.collection('registrations').where({
        activity_id: id,
        user_id: userId
      }).get();

      if (regResult.data.length > 0) {
        isRegistered = true;
        registration = regResult.data[0];
      }
    }

    // 获取已报名用户
    const participantsResult = await db.collection('registrations')
      .where({
        activity_id: id,
        status: _.in(['registered', 'checked_in'])
      })
      .get();

    // 获取用户信息
    const userIds = participantsResult.data.map(r => r.user_id);
    const usersResult = await db.collection('users')
      .where({ _id: _.in(userIds) })
      .get();

    const userMap = {};
    usersResult.data.forEach(u => {
      userMap[u._id] = u;
    });

    const participants = participantsResult.data.map(r => ({
      _id: r._id,
      user_id: r.user_id,
      nickname: userMap[r.user_id]?.nickname || '',
      avatar: userMap[r.user_id]?.avatar || '',
      status: r.status
    }));

    return {
      code: 0,
      data: {
        activity,
        isRegistered,
        registration,
        participants
      }
    };
  } catch (error) {
    console.error('获取活动详情失败', error);
    return { code: -1, message: '获取失败' };
  }
}

// 报名活动
async function handleRegister(data, wxContext) {
  const openid = wxContext.OPENID;
  const { activityId } = data;

  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({
      openid,
      status: 'approved'
    }).get();

    if (userResult.data.length === 0) {
      return { code: -1, message: '您还不是正式团员' };
    }

    const userId = userResult.data[0]._id;

    // 检查活动
    const activityResult = await db.collection('activities').doc(activityId).get();
    const activity = activityResult.data;

    if (activity.status !== 'published') {
      return { code: -1, message: '活动状态不允许报名' };
    }

    // 检查名额
    if (activity.registered_count >= activity.quota) {
      return { code: -1, message: '名额已满' };
    }

    // 检查是否已报名
    const existResult = await db.collection('registrations').where({
      activity_id: activityId,
      user_id: userId
    }).get();

    if (existResult.data.length > 0) {
      return { code: -1, message: '您已报名' };
    }

    // 创建报名记录
    await db.collection('registrations').add({
      data: {
        activity_id: activityId,
        user_id: userId,
        status: 'registered',
        created_at: db.serverDate()
      }
    });

    // 更新报名人数
    await db.collection('activities').doc(activityId).update({
      data: {
        registered_count: _.inc(1),
        updated_at: db.serverDate()
      }
    });

    return { code: 0, message: '报名成功' };
  } catch (error) {
    console.error('报名失败', error);
    return { code: -1, message: '报名失败' };
  }
}

// 取消报名
async function handleCancelRegistration(data, wxContext) {
  const openid = wxContext.OPENID;
  const { activityId } = data;

  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({ openid }).get();
    const userId = userResult.data[0]._id;

    // 查找报名记录
    const regResult = await db.collection('registrations').where({
      activity_id: activityId,
      user_id: userId,
      status: 'registered'
    }).get();

    if (regResult.data.length === 0) {
      return { code: -1, message: '未找到报名记录' };
    }

    // 更新报名状态
    await db.collection('registrations').doc(regResult.data[0]._id).update({
      data: {
        status: 'cancelled',
        updated_at: db.serverDate()
      }
    });

    // 更新报名人数
    await db.collection('activities').doc(activityId).update({
      data: {
        registered_count: _.inc(-1),
        updated_at: db.serverDate()
      }
    });

    return { code: 0, message: '已取消报名' };
  } catch (error) {
    console.error('取消报名失败', error);
    return { code: -1, message: '取消失败' };
  }
}

// 签到
async function handleCheckIn(data, wxContext) {
  const openid = wxContext.OPENID;
  const { activityId, userId } = data;

  try {
    // 检查权限
    const adminResult = await db.collection('users').where({
      openid,
      role: _.in(['admin', 'leader'])
    }).get();

    if (adminResult.data.length === 0) {
      return { code: -1, message: '没有权限' };
    }

    // 更新签到状态
    await db.collection('registrations').where({
      activity_id: activityId,
      user_id: userId,
      status: 'registered'
    }).update({
      data: {
        status: 'checked_in',
        checked_in_at: db.serverDate()
      }
    });

    // 获取活动积分
    const activityResult = await db.collection('activities').doc(activityId).get();
    const points = activityResult.data.points;

    // 发放积分
    await db.collection('users').doc(userId).update({
      data: {
        points: _.inc(points)
      }
    });

    // 记录积分日志
    await db.collection('point_logs').add({
      data: {
        user_id: userId,
        points,
        type: 'activity',
        related_id: activityId,
        remark: '活动签到',
        created_at: db.serverDate()
      }
    });

    return { code: 0, message: '签到成功' };
  } catch (error) {
    console.error('签到失败', error);
    return { code: -1, message: '签到失败' };
  }
}