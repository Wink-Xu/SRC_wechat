// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 测试 openid 列表
const TEST_OPENIDS = [
  'test_openid_leader_001',
  'test_openid_admin_001',
  'test_openid_member_001',
  'test_openid_pending_001',
  'test_openid_guest_001'
];

// 获取用户（支持测试模式）
async function getUser(openid, testOpenid) {
  // 如果传入了测试 openid 且在测试列表中，使用测试 openid
  const actualOpenid = (testOpenid && TEST_OPENIDS.includes(testOpenid)) ? testOpenid : openid;

  const userResult = await db.collection('users').where({ openid: actualOpenid }).get();
  return userResult.data.length > 0 ? userResult.data[0] : null;
}

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { action, testOpenid, ...data } = event;

  switch (action) {
    case 'create':
      return handleCreate(data, wxContext, testOpenid);
    case 'update':
      return handleUpdate(data, wxContext, testOpenid);
    case 'updatePhotos':
      return handleUpdatePhotos(data, wxContext, testOpenid);
    case 'publish':
      return handlePublish(data, wxContext, testOpenid);
    case 'cancel':
      return handleCancel(data, wxContext, testOpenid);
    case 'delete':
      return handleDelete(data, wxContext, testOpenid);
    case 'getList':
      return handleGetList(data, wxContext, testOpenid);
    case 'getListOptimized':
      return handleGetListOptimized(data, wxContext, testOpenid);
    case 'getDetail':
      return handleGetDetail(data, wxContext, testOpenid);
    case 'register':
      return handleRegister(data, wxContext, testOpenid);
    case 'cancelRegistration':
      return handleCancelRegistration(data, wxContext, testOpenid);
    case 'checkIn':
      return handleCheckIn(data, wxContext, testOpenid);
    case 'selfCheckIn':
      return handleSelfCheckIn(data, wxContext, testOpenid);
    case 'getCheckInQrCode':
      return handleGetCheckInQrCode(data, wxContext, testOpenid);
    case 'finishActivityWithCheckIn':
      return handleFinishActivityWithCheckIn(data, wxContext, testOpenid);
    case 'restartActivity':
      return handleRestartActivity(data, wxContext, testOpenid);
    case 'uploadPhotos':
      return handleUploadPhotos(data, wxContext, testOpenid);
    case 'updateCoverImage':
      return handleUpdateCoverImage(data, wxContext, testOpenid);
    default:
      return { code: -1, message: '未知操作' };
  }
};

// 内容安全检测（文本）
async function checkContent(text) {
  if (!text || !text.trim()) return true;
  try {
    const result = await cloud.openapi.security.msgSecCheck({
      content: text
    });
    // 检查 API 调用是否成功（errCode === 0）
    if (result.errCode !== 0 && result.errCode !== undefined) {
      console.warn('[内容安全检测] API 返回错误', result);
    }
    // result.result 为 'pass'/'risky'/'need_review'
    return result.result === 'pass';
  } catch (err) {
    console.error('[内容安全检测] 异常', err);
    // 检测异常时放行，避免影响正常功能
    return true;
  }
}

// 创建活动
async function handleCreate(data, wxContext, testOpenid) {
  try {
    const user = await getUser(wxContext.OPENID, testOpenid);

    if (!user || !['activity_admin', 'leader'].includes(user.role)) {
      return { code: -1, message: '没有权限' };
    }

    // 内容安全检测（非阻塞：检测失败/不通过仅记录日志，不阻止用户操作）
    try {
      const titleOk = await checkContent(data.title);
      const descOk = await checkContent(data.description || '');
      if (!titleOk || !descOk) {
        console.warn('[内容安全检测] 内容疑似违规', { title: data.title });
      }
    } catch (err) {
      console.error('[内容安全检测] 异常', err);
    }

    const isRecurring = data.is_recurring && data.repeat_days && data.repeat_days.length > 0;
    const { is_recurring, repeat_days, ...baseData } = data;

    if (isRecurring) {
      // 重复模式：为每个选中日期创建一个活动
      return await createRecurringActivities(baseData, repeat_days, user);
    }

    // 单次活动
    const activity = {
      ...baseData,
      status: 'ongoing',
      created_by: user._id,
      registered_count: 0,
      check_in_count: 0,
      created_at: db.serverDate(),
      updated_at: db.serverDate()
    };

    const result = await db.collection('activities').add({
      data: activity
    });

    return {
      code: 0,
      data: { id: result._id, activity },
      message: '创建成功'
    };
  } catch (error) {
    console.error('创建活动失败', error);
    return { code: -1, message: '创建失败' };
  }
}

// 创建重复活动
async function createRecurringActivities(baseData, repeatDays, user) {
  const createdIds = [];
  const baseTime = new Date(baseData.start_time);
  const baseDeadline = baseData.registration_deadline ? new Date(baseData.registration_deadline) : null;
  const baseDayOfWeek = baseTime.getDay(); // 0=周日, 1-6=周一至周六

  // map repeatDays from our format (1=周一...7=周日) to JS getDay() format (0=周日, 1=周一...6=周六)
  const jsDayMap = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 0 };

  for (const day of repeatDays) {
    const targetDay = jsDayMap[day];
    if (targetDay === undefined) continue;

    // 计算距离目标日期的天数
    let diff = targetDay - baseDayOfWeek;
    if (diff < 0) diff += 7;

    const activityTime = new Date(baseTime);
    activityTime.setDate(activityTime.getDate() + diff);

    const activityData = {
      ...baseData,
      start_time: activityTime.toISOString(),
      is_recurring: true,
      status: 'ongoing',
      created_by: user._id,
      registered_count: 0,
      check_in_count: 0,
      created_at: db.serverDate(),
      updated_at: db.serverDate()
    };

    // 调整报名截止时间
    if (baseDeadline) {
      const deadlineTime = new Date(baseDeadline);
      deadlineTime.setDate(deadlineTime.getDate() + diff);
      activityData.registration_deadline = deadlineTime.toISOString();
    }

    const result = await db.collection('activities').add({
      data: activityData
    });

    createdIds.push(result._id);
  }

  return {
    code: 0,
    data: { ids: createdIds, count: createdIds.length },
    message: `已创建 ${createdIds.length} 个活动`
  };
}

// 更新活动
async function handleUpdate(data, wxContext, testOpenid) {
  const { id, ...updateData } = data;

  try {
    const user = await getUser(wxContext.OPENID, testOpenid);

    if (!user || !['activity_admin', 'leader'].includes(user.role)) {
      return { code: -1, message: '没有权限' };
    }

    // 内容安全检测（非阻塞）
    try {
      const titleOk = await checkContent(updateData.title || '');
      const descOk = await checkContent(updateData.description || '');
      if (!titleOk || !descOk) {
        console.warn('[内容安全检测] 内容疑似违规', { title: updateData.title });
      }
    } catch (err) {
      console.error('[内容安全检测] 异常', err);
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

// 更新活动照片（管理员或团长可操作）
async function handleUpdatePhotos(data, wxContext, testOpenid) {
  const { id, photos } = data;

  try {
    const user = await getUser(wxContext.OPENID, testOpenid);

    // 只有管理员或团长可以上传照片
    if (!user || !['activity_admin', 'leader'].includes(user.role)) {
      return { code: -1, message: '没有权限' };
    }

    // 检查活动是否存在
    const activityResult = await db.collection('activities').doc(id).get();
    if (!activityResult.data) {
      return { code: -1, message: '活动不存在' };
    }

    const activity = activityResult.data;
    const newPhotos = activity.photos ? activity.photos.concat(photos) : photos;

    const updateData = {
      photos: newPhotos,
      updated_at: db.serverDate()
    };

    // 如果没有封面图，使用第一张照片
    if (!activity.cover_image && photos.length > 0) {
      updateData.cover_image = photos[0];
    }

    await db.collection('activities').doc(id).update({
      data: updateData
    });

    return {
      code: 0,
      data: {
        photos: newPhotos,
        cover_image: updateData.cover_image || activity.cover_image
      },
      message: '照片更新成功'
    };
  } catch (error) {
    console.error('更新照片失败', error);
    return { code: -1, message: '更新失败' };
  }
}

// 更新活动封面图（管理员或团长可操作）
async function handleUpdateCoverImage(data, wxContext, testOpenid) {
  const { id, coverImage } = data;

  try {
    const user = await getUser(wxContext.OPENID, testOpenid);

    // 只有管理员或团长可以更新封面
    if (!user || !['activity_admin', 'leader'].includes(user.role)) {
      return { code: -1, message: '没有权限' };
    }

    await db.collection('activities').doc(id).update({
      data: {
        cover_image: coverImage,
        updated_at: db.serverDate()
      }
    });

    return {
      code: 0,
      data: { cover_image: coverImage },
      message: '封面更新成功'
    };
  } catch (error) {
    console.error('更新封面失败', error);
    return { code: -1, message: '更新失败' };
  }
}

// 发布活动
async function handlePublish(data, wxContext, testOpenid) {
  const { id } = data;

  try {
    const user = await getUser(wxContext.OPENID, testOpenid);

    if (!user || !['activity_admin', 'leader'].includes(user.role)) {
      return { code: -1, message: '没有权限' };
    }

    await db.collection('activities').doc(id).update({
      data: {
        status: 'ongoing',
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
async function handleCancel(data, wxContext, testOpenid) {
  const { id } = data;

  try {
    const user = await getUser(wxContext.OPENID, testOpenid);

    if (!user || !['activity_admin', 'leader'].includes(user.role)) {
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

// 删除活动
async function handleDelete(data, wxContext, testOpenid) {
  const { id } = data;

  try {
    const user = await getUser(wxContext.OPENID, testOpenid);

    if (!user || !['activity_admin', 'leader'].includes(user.role)) {
      return { code: -1, message: '没有权限' };
    }

    await db.collection('activities').doc(id).remove();

    return { code: 0, message: '删除成功' };
  } catch (error) {
    console.error('删除活动失败', error);
    return { code: -1, message: '删除失败' };
  }
}

// 获取活动列表
async function handleGetList(data, wxContext, testOpenid) {
  const { page = 1, limit = 20, status, registered, createdByMe, all, myActivities } = data;

  try {
    const user = await getUser(wxContext.OPENID, testOpenid);
    const userId = user ? user._id : null;

    let query = db.collection('activities');

    // 全部模式（用于管理后台）
    if (!all) {
      // 状态筛选
      if (status && status !== 'all') {
        const statusList = status.split(',');
        query = query.where({ status: _.in(statusList) });
      }

      // 我报名的活动
      if (registered && userId) {
        const regResult = await db.collection('registrations').where({
          user_id: userId,
          status: _.in(['registered', 'checked_in'])
        }).get();

        const activityIds = regResult.data.map(r => r.activity_id);
        if (activityIds.length > 0) {
          query = query.where({ _id: _.in(activityIds) });
        } else {
          return { code: 0, data: { list: [], total: 0, page, limit } };
        }
      }

      // 我创建的活动
      if (createdByMe && userId) {
        query = query.where({ created_by: userId });
      }
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

    // 获取每个活动的报名人数和用户状态
    const activities = listResult.data;
    for (const activity of activities) {
      const regCount = await db.collection('registrations').where({
        activity_id: activity._id,
        status: _.in(['registered', 'checked_in'])
      }).count();
      activity.registered_count = regCount.total;

      // 获取当前用户在该活动的状态
      if (userId) {
        const userRegResult = await db.collection('registrations').where({
          activity_id: activity._id,
          user_id: userId
        }).get();

        if (userRegResult.data.length > 0) {
          activity.user_status = userRegResult.data[0].status;
          activity.user_checked_in = userRegResult.data[0].status === 'checked_in';
        } else {
          activity.user_status = null;
          activity.user_checked_in = false;
        }
      }
    }

    return {
      code: 0,
      data: {
        list: activities,
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

// 获取活动列表（优化版：一次请求返回所有状态 + 批量查询报名数）
async function handleGetListOptimized(data, wxContext, testOpenid) {
  const { page = 1, limit = 20 } = data;

  try {
    const user = await getUser(wxContext.OPENID, testOpenid);
    const userId = user ? user._id : null;

    // 一次性获取所有活动（不分状态），按创建时间倒序
    const query = db.collection('activities');
    const countResult = await query.count();
    const total = countResult.total;

    const skip = (page - 1) * limit;
    const listResult = await query
      .orderBy('created_at', 'desc')
      .skip(skip)
      .limit(limit)
      .get();

    const activities = listResult.data;

    if (activities.length === 0) {
      return { code: 0, data: { list: [], total, page, limit } };
    }

    const activityIds = activities.map(a => a._id);

    // 批量查询每个活动的报名数（一条 aggregation 搞定）
    const regCountResult = await db.collection('registrations')
      .where({
        activity_id: _.in(activityIds),
        status: _.in(['registered', 'checked_in'])
      })
      .get();

    // 按 activity_id 分组统计
    const countMap = {};
    regCountResult.data.forEach(reg => {
      const aid = reg.activity_id;
      countMap[aid] = (countMap[aid] || 0) + 1;
    });

    // 批量查询用户在各活动的报名状态
    let userRegMap = {};
    if (userId) {
      const userRegResult = await db.collection('registrations').where({
        activity_id: _.in(activityIds),
        user_id: userId
      }).get();

      userRegResult.data.forEach(reg => {
        userRegMap[reg.activity_id] = {
          status: reg.status,
          checked_in: reg.status === 'checked_in'
        };
      });
    }

    // 组装数据
    activities.forEach(activity => {
      activity.registered_count = countMap[activity._id] || 0;

      if (userId && userRegMap[activity._id]) {
        activity.user_status = userRegMap[activity._id].status;
        activity.user_checked_in = userRegMap[activity._id].checked_in;
      } else {
        activity.user_status = null;
        activity.user_checked_in = false;
      }
    });

    // 按状态分组
    const ongoingList = activities.filter(a => a.status === 'ongoing');
    const endedList = activities.filter(a => a.status === 'ended' || a.status === 'cancelled');

    return {
      code: 0,
      data: {
        ongoingList,
        endedList,
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
async function handleGetDetail(data, wxContext, testOpenid) {
  const { id } = data;

  try {
    // 获取活动
    const activityResult = await db.collection('activities').doc(id).get();
    const activity = activityResult.data;

    if (!activity) {
      return { code: -1, message: '活动不存在' };
    }

    const user = await getUser(wxContext.OPENID, testOpenid);
    const userId = user ? user._id : null;

    // 检查是否已报名
    let isRegistered = false;
    let registration = null;

    if (userId) {
      const regResult = await db.collection('registrations').where({
        activity_id: id,
        user_id: userId,
        status: _.in(['registered', 'checked_in'])
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
    const usersResult = userIds.length > 0 ? await db.collection('users')
      .where({ _id: _.in(userIds) })
      .get() : { data: [] };

    const userMap = {};
    usersResult.data.forEach(u => {
      userMap[u._id] = u;
    });

    const participants = participantsResult.data.map(r => ({
      _id: r._id,
      user_id: r.user_id,
      nickname: userMap[r.user_id]?.nickname || '',
      avatar: userMap[r.user_id]?.avatar || '',
      check_in_status: r.status
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
async function handleRegister(data, wxContext, testOpenid) {
  const { activityId, phone } = data;

  try {
    const user = await getUser(wxContext.OPENID, testOpenid);

    if (!user) {
      return { code: -1, message: '用户不存在，请先登录' };
    }

    const userId = user._id;
    const isMember = user.status === 'approved';

    // 检查活动
    const activityResult = await db.collection('activities').doc(activityId).get();
    const activity = activityResult.data;

    if (!activity) {
      return { code: -1, message: '活动不存在' };
    }

    if (activity.status !== 'ongoing') {
      return { code: -1, message: '活动状态不允许报名' };
    }

    // 检查报名截止时间
    if (activity.registration_deadline) {
      const deadline = new Date(activity.registration_deadline);
      const now = new Date();
      if (now > deadline) {
        return { code: -1, message: '报名已截止' };
      }
    }

    // 检查报名权限
    if (activity.member_only && !isMember) {
      return { code: -1, message: '此活动仅限团员报名' };
    }

    // 游客报名需要填写手机号
    if (!isMember && !phone) {
      return { code: -1, message: '请填写手机号', requirePhone: true };
    }

    // 检查名额
    if (activity.registered_count >= activity.quota) {
      return { code: -1, message: '名额已满' };
    }

    // 检查是否已报名
    const existResult = await db.collection('registrations').where({
      activity_id: activityId,
      user_id: userId,
      status: _.in(['registered', 'checked_in'])
    }).get();

    if (existResult.data.length > 0) {
      return { code: -1, message: '您已报名' };
    }

    // 处理收费报名
    if (activity.registration_fee_type === 'points' && activity.registration_fee > 0) {
      // 检查积分是否足够
      if (!user.points || user.points < activity.registration_fee) {
        return { code: -1, message: '积分不足', requirePoints: activity.registration_fee };
      }

      // 扣除积分
      await db.collection('users').doc(userId).update({
        data: { points: _.inc(-activity.registration_fee) }
      });

      // 记录积分日志
      await db.collection('point_logs').add({
        data: {
          user_id: userId,
          points: -activity.registration_fee,
          type: 'activity_registration',
          related_id: activityId,
          remark: '报名活动：' + activity.title,
          created_at: db.serverDate()
        }
      });
    }

    // 创建报名记录
    const registrationData = {
      activity_id: activityId,
      user_id: userId,
      status: 'registered',
      check_in_status: 'registered',
      points_awarded: false,
      created_at: db.serverDate()
    };

    // 游客报名记录手机号
    if (!isMember && phone) {
      registrationData.guest_phone = phone;
    }

    await db.collection('registrations').add({
      data: registrationData
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
async function handleCancelRegistration(data, wxContext, testOpenid) {
  const { activityId } = data;

  try {
    const user = await getUser(wxContext.OPENID, testOpenid);

    if (!user) {
      return { code: -1, message: '用户不存在' };
    }

    const userId = user._id;

    // 查找报名记录
    const regResult = await db.collection('registrations').where({
      activity_id: activityId,
      user_id: userId,
      status: 'registered'
    }).get();

    if (regResult.data.length === 0) {
      return { code: -1, message: '未找到报名记录' };
    }

    const regId = regResult.data[0]._id;

    // 更新报名状态
    await db.collection('registrations').doc(regId).update({
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
async function handleCheckIn(data, wxContext, testOpenid) {
  const { activityId, userId } = data;

  try {
    const user = await getUser(wxContext.OPENID, testOpenid);

    if (!user || !['activity_admin', 'leader'].includes(user.role)) {
      return { code: -1, message: '没有权限' };
    }

    // 查找报名记录
    const regResult = await db.collection('registrations').where({
      activity_id: activityId,
      user_id: userId,
      status: 'registered'
    }).get();

    if (regResult.data.length === 0) {
      return { code: -1, message: '该用户未报名' };
    }

    const regId = regResult.data[0]._id;

    // 更新签到状态
    await db.collection('registrations').doc(regId).update({
      data: {
        status: 'checked_in',
        check_in_status: 'checked_in',
        points_awarded: false,  // 确保设置这个字段
        checked_in_at: db.serverDate()
      }
    });

    // 更新签到人数
    await db.collection('activities').doc(activityId).update({
      data: {
        check_in_count: _.inc(1),
        updated_at: db.serverDate()
      }
    });

    return { code: 0, message: '签到成功' };
  } catch (error) {
    console.error('签到失败', error);
    return { code: -1, message: '签到失败' };
  }
}

// 获取签到小程序码
async function handleGetCheckInQrCode(data, wxContext, testOpenid) {
  const { activityId, id } = data;
  const actualActivityId = activityId || id;

  try {
    const user = await getUser(wxContext.OPENID, testOpenid);

    if (!user || !['activity_admin', 'leader'].includes(user.role)) {
      return { code: -1, message: '没有权限' };
    }

    // 获取活动
    const activityResult = await db.collection('activities').doc(actualActivityId).get();
    const activity = activityResult.data;

    if (!activity) {
      return { code: -1, message: '活动不存在' };
    }

    try {
      // 生成小程序码（体验版）
      // 使用 wxacode.get 可以指定 env_version 为体验版
      const qrResult = await cloud.openapi.wxacode.get({
        path: `pages/scan-checkin/scan-checkin?scene=${actualActivityId}`,
        width: 430,
        env_version: 'trial'  // 关键：生成体验版二维码
      });

      // 上传到云存储
      const cloudPath = `checkin_qrcodes/${actualActivityId}_${Date.now()}.png`;
      const uploadResult = await cloud.uploadFile({
        cloudPath: cloudPath,
        fileContent: qrResult.buffer
      });

      // 获取临时访问 URL
      const tempUrlResult = await cloud.getTempFileURL({
        fileList: [uploadResult.fileID]
      });

      const qrCodeUrl = tempUrlResult.fileList[0] && tempUrlResult.fileList[0].tempFileURL
        ? tempUrlResult.fileList[0].tempFileURL
        : uploadResult.fileID;

      return {
        code: 0,
        data: {
          activity_id: actualActivityId,
          qr_code: qrCodeUrl,
          check_in_count: activity.check_in_count || 0
        }
      };
    } catch (qrError) {
      console.error('生成小程序码失败，使用备用二维码', qrError);
      // 如果生成小程序码失败，使用普通二维码
      const qrContent = JSON.stringify({
        type: 'checkin',
        activity_id: actualActivityId
      });
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrContent)}`;

      return {
        code: 0,
        data: {
          activity_id: actualActivityId,
          qr_code: qrCodeUrl,
          check_in_count: activity.check_in_count || 0
        }
      };
    }
  } catch (error) {
    console.error('获取签到码失败', error);
    return { code: -1, message: '获取失败' };
  }
}

// 团员自助签到
async function handleSelfCheckIn(data, wxContext, testOpenid) {
  const { activityId } = data;

  try {
    const user = await getUser(wxContext.OPENID, testOpenid);

    if (!user) {
      return { code: -1, message: '请先登录' };
    }

    if (user.status !== 'approved') {
      return { code: -1, message: '您还不是正式团员' };
    }

    // 检查活动状态
    const activityResult = await db.collection('activities').doc(activityId).get();
    const activity = activityResult.data;

    if (!activity) {
      return { code: -1, message: '活动不存在' };
    }

    if (!['ongoing'].includes(activity.status)) {
      return { code: -1, message: '活动未开始或已结束' };
    }

    // 查找报名记录
    const regResult = await db.collection('registrations').where({
      activity_id: activityId,
      user_id: user._id,
      status: 'registered'
    }).get();

    if (regResult.data.length === 0) {
      // 检查是否已签到
      const checkedResult = await db.collection('registrations').where({
        activity_id: activityId,
        user_id: user._id,
        status: 'checked_in'
      }).get();

      if (checkedResult.data.length > 0) {
        return { code: -1, message: '您已签到' };
      }

      return { code: -1, message: '您未报名此活动' };
    }

    const regId = regResult.data[0]._id;

    // 更新签到状态
    await db.collection('registrations').doc(regId).update({
      data: {
        status: 'checked_in',
        check_in_status: 'checked_in',
        points_awarded: false,  // 确保设置这个字段
        checked_in_at: db.serverDate()
      }
    });

    // 更新签到人数
    await db.collection('activities').doc(activityId).update({
      data: {
        check_in_count: _.inc(1),
        updated_at: db.serverDate()
      }
    });

    return { code: 0, message: '签到成功', data: { points: activity.points || 20 } };
  } catch (error) {
    console.error('签到失败', error);
    return { code: -1, message: '签到失败' };
  }
}

// 结束活动并发放积分
async function handleFinishActivityWithCheckIn(data, wxContext, testOpenid) {
  const { activityId, id } = data;
  const actualActivityId = activityId || id;

  try {
    const user = await getUser(wxContext.OPENID, testOpenid);

    if (!user || !['activity_admin', 'leader'].includes(user.role)) {
      return { code: -1, message: '没有权限' };
    }

    // 获取活动
    const activityResult = await db.collection('activities').doc(actualActivityId).get();
    const activity = activityResult.data;

    if (!activity) {
      return { code: -1, message: '活动不存在' };
    }

    // 更新活动状态
    await db.collection('activities').doc(actualActivityId).update({
      data: {
        status: 'ended',
        updated_at: db.serverDate()
      }
    });

    // 获取所有已签到的用户（points_awarded 不是 true 的）
    const checkInUsers = await db.collection('registrations').where({
      activity_id: actualActivityId,
      status: 'checked_in',
      points_awarded: _.neq(true)  // 不等于 true，包括 false 和 undefined
    }).get();

    console.log('[结束活动] 活动ID:', actualActivityId, '签到用户数:', checkInUsers.data.length);

    const points = activity.points || 20;
    let awardedCount = 0;

    // 给每个已签到的用户发放积分
    for (const reg of checkInUsers.data) {
      try {
        // 给用户增加积分
        await db.collection('users').doc(reg.user_id).update({
          data: {
            points: _.inc(points)
          }
        });

        // 记录积分日志
        await db.collection('point_logs').add({
          data: {
            user_id: reg.user_id,
            points: points,
            type: 'activity_checkin',
            related_id: actualActivityId,
            remark: '活动签到：' + (activity.title || ''),
            created_at: db.serverDate()
          }
        });

        // 标记积分已发放
        await db.collection('registrations').doc(reg._id).update({
          data: {
            points_awarded: true
          }
        });

        awardedCount++;
        console.log('[结束活动] 用户积分发放成功:', reg.user_id);
      } catch (userError) {
        console.error('[结束活动] 用户积分发放失败:', reg.user_id, userError.message);
      }
    }

    console.log('[结束活动] 完成，成功发放人数:', awardedCount);

    return {
      code: 0,
      data: {
        success: true,
        awarded_count: awardedCount,
        points_per_person: points
      },
      message: '活动已结束，积分已发放'
    };
  } catch (error) {
    console.error('[结束活动] 失败:', error);
    return { code: -1, message: '结束活动失败: ' + (error.message || error) };
  }
}

// 重启活动（撤销积分发放）
async function handleRestartActivity(data, wxContext, testOpenid) {
  const { activityId, id } = data;
  const actualActivityId = activityId || id;

  try {
    const user = await getUser(wxContext.OPENID, testOpenid);

    if (!user || !['activity_admin', 'leader'].includes(user.role)) {
      return { code: -1, message: '没有权限' };
    }

    // 获取活动
    const activityResult = await db.collection('activities').doc(actualActivityId).get();
    const activity = activityResult.data;

    if (!activity) {
      return { code: -1, message: '活动不存在' };
    }

    if (activity.status !== 'ended') {
      return { code: -1, message: '只有已结束的活动才能重启' };
    }

    // 获取已发放积分的签到记录
    const awardedUsers = await db.collection('registrations').where({
      activity_id: actualActivityId,
      status: 'checked_in',
      points_awarded: true
    }).get();

    const points = activity.points || 20;
    let revokedCount = 0;

    // 撤销积分
    for (const reg of awardedUsers.data) {
      try {
        // 扣回用户积分
        await db.collection('users').doc(reg.user_id).update({
          data: {
            points: _.inc(-points)
          }
        });

        // 删除积分日志
        await db.collection('point_logs').where({
          user_id: reg.user_id,
          related_id: actualActivityId,
          type: 'activity_checkin'
        }).remove();

        // 重置积分发放标记
        await db.collection('registrations').doc(reg._id).update({
          data: {
            points_awarded: false
          }
        });

        revokedCount++;
      } catch (userError) {
        console.error('[重启活动] 撤销积分失败:', reg.user_id, userError.message);
      }
    }

    // 更新活动状态为进行中
    await db.collection('activities').doc(actualActivityId).update({
      data: {
        status: 'ongoing',
        updated_at: db.serverDate()
      }
    });

    console.log('[重启活动] 完成，撤销积分人数:', revokedCount);

    return {
      code: 0,
      data: {
        success: true,
        revoked_count: revokedCount,
        points_per_person: points
      },
      message: '活动已重启，已撤销 ' + revokedCount + ' 人的积分'
    };
  } catch (error) {
    console.error('[重启活动] 失败:', error);
    return { code: -1, message: '重启活动失败: ' + (error.message || error) };
  }
}

// 上传照片
async function handleUploadPhotos(data, wxContext, testOpenid) {
  const { activityId, photos } = data;

  try {
    const user = await getUser(wxContext.OPENID, testOpenid);

    if (!user || !['activity_admin', 'leader'].includes(user.role)) {
      return { code: -1, message: '没有权限' };
    }

    // 检查活动是否存在
    const activityResult = await db.collection('activities').doc(activityId).get();
    if (!activityResult.data) {
      return { code: -1, message: '活动不存在' };
    }

    const activity = activityResult.data;
    const uploadedUrls = [];

    // 上传照片到云存储
    for (const tempFilePath of photos) {
      const cloudPath = `activities/${activityId}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;

      const uploadResult = await cloud.uploadFile({
        cloudPath: cloudPath,
        fileContent: tempFilePath
      });

      uploadedUrls.push(uploadResult.fileID);
    }

    // 更新活动的 photos 数组
    const newPhotos = activity.photos ? activity.photos.concat(uploadedUrls) : uploadedUrls;

    const updateData = {
      photos: newPhotos,
      updated_at: db.serverDate()
    };

    if (!activity.cover_image && uploadedUrls.length > 0) {
      updateData.cover_image = uploadedUrls[0];
    }

    await db.collection('activities').doc(activityId).update({
      data: updateData
    });

    return {
      code: 0,
      data: {
        photos: newPhotos,
        cover_image: updateData.cover_image || activity.cover_image
      },
      message: '上传成功'
    };
  } catch (error) {
    console.error('上传照片失败', error);
    return { code: -1, message: '上传失败' };
  }
}