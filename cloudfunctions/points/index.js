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
    case 'getBalance':
      return handleGetBalance(data, wxContext);
    case 'getLogs':
      return handleGetLogs(data, wxContext);
    case 'getRanking':
      return handleGetRanking(data, wxContext);
    case 'addPoints':
      return handleAddPoints(data, wxContext);
    case 'deductPoints':
      return handleDeductPoints(data, wxContext);
    default:
      return { code: -1, message: '未知操作' };
  }
};

// 获取积分余额
async function handleGetBalance(data, wxContext) {
  const openid = wxContext.OPENID;

  try {
    const userResult = await db.collection('users').where({ openid }).get();

    if (userResult.data.length === 0) {
      return { code: -1, message: '用户不存在' };
    }

    return {
      code: 0,
      data: {
        points: userResult.data[0].points || 0
      }
    };
  } catch (error) {
    console.error('获取积分失败', error);
    return { code: -1, message: '获取失败' };
  }
}

// 获取积分记录
async function handleGetLogs(data, wxContext) {
  const openid = wxContext.OPENID;
  const { page = 1, limit = 20 } = data;

  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({ openid }).get();
    const userId = userResult.data[0]._id;

    // 查询积分记录
    const countResult = await db.collection('point_logs')
      .where({ user_id: userId })
      .count();

    const total = countResult.total;
    const skip = (page - 1) * limit;

    const listResult = await db.collection('point_logs')
      .where({ user_id: userId })
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
    console.error('获取积分记录失败', error);
    return { code: -1, message: '获取失败' };
  }
}

// 获取积分榜
async function handleGetRanking(data, wxContext) {
  const openid = wxContext.OPENID;

  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({ openid }).get();
    const currentUserId = userResult.data.length > 0 ? userResult.data[0]._id : null;

    // 获取排行榜
    const listResult = await db.collection('users')
      .where({
        status: 'approved'
      })
      .orderBy('points', 'desc')
      .limit(50)
      .field({
        _id: true,
        nickname: true,
        avatar: true,
        points: true
      })
      .get();

    // 查找当前用户排名
    let myRank = null;
    if (currentUserId) {
      const rankResult = await db.collection('users')
        .where({
          status: 'approved',
          points: _.gt(userResult.data[0].points || 0)
        })
        .count();
      myRank = rankResult.total + 1;
    }

    return {
      code: 0,
      data: {
        list: listResult.data,
        myRank
      }
    };
  } catch (error) {
    console.error('获取排行榜失败', error);
    return { code: -1, message: '获取失败' };
  }
}

// 增加积分（管理员操作）
async function handleAddPoints(data, wxContext) {
  const openid = wxContext.OPENID;
  const { userId, points, remark } = data;

  try {
    // 检查权限
    const adminResult = await db.collection('users').where({
      openid,
      role: _.in(['admin', 'leader'])
    }).get();

    if (adminResult.data.length === 0) {
      return { code: -1, message: '没有权限' };
    }

    // 更新用户积分
    await db.collection('users').doc(userId).update({
      data: {
        points: _.inc(points)
      }
    });

    // 记录日志
    await db.collection('point_logs').add({
      data: {
        user_id: userId,
        points,
        type: 'admin',
        remark: remark || '管理员调整',
        created_at: db.serverDate()
      }
    });

    return { code: 0, message: '操作成功' };
  } catch (error) {
    console.error('增加积分失败', error);
    return { code: -1, message: '操作失败' };
  }
}

// 扣除积分
async function handleDeductPoints(data, wxContext) {
  const openid = wxContext.OPENID;
  const { userId, points, remark } = data;

  try {
    // 检查权限
    const adminResult = await db.collection('users').where({
      openid,
      role: _.in(['admin', 'leader'])
    }).get();

    if (adminResult.data.length === 0) {
      return { code: -1, message: '没有权限' };
    }

    // 检查用户积分是否足够
    const userResult = await db.collection('users').doc(userId).get();
    if (userResult.data.points < points) {
      return { code: -1, message: '积分不足' };
    }

    // 更新用户积分
    await db.collection('users').doc(userId).update({
      data: {
        points: _.inc(-points)
      }
    });

    // 记录日志
    await db.collection('point_logs').add({
      data: {
        user_id: userId,
        points: -points,
        type: 'admin',
        remark: remark || '管理员调整',
        created_at: db.serverDate()
      }
    });

    return { code: 0, message: '操作成功' };
  } catch (error) {
    console.error('扣除积分失败', error);
    return { code: -1, message: '操作失败' };
  }
}