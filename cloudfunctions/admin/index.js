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
    case 'getStatistics':
      return handleGetStatistics(data, wxContext);
    case 'getPendingMembers':
      return handleGetPendingMembers(data, wxContext);
    case 'manageProduct':
      return handleManageProduct(data, wxContext);
    case 'updateOrderStatus':
      return handleUpdateOrderStatus(data, wxContext);
    case 'getOrders':
      return handleGetOrders(data, wxContext);
    default:
      return { code: -1, message: '未知操作' };
  }
};

// 获取统计数据
async function handleGetStatistics(data, wxContext) {
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

    // 获取成员数量
    const memberCount = await db.collection('users')
      .where({ status: 'approved' })
      .count();

    // 获取待审批数量
    const pendingCount = await db.collection('users')
      .where({ status: 'pending' })
      .count();

    // 获取活动数量
    const activityCount = await db.collection('activities').count();

    // 获取订单数量
    const orderCount = await db.collection('orders').count();

    return {
      code: 0,
      data: {
        memberCount: memberCount.total,
        pendingCount: pendingCount.total,
        activityCount: activityCount.total,
        orderCount: orderCount.total
      }
    };
  } catch (error) {
    console.error('获取统计数据失败', error);
    return { code: -1, message: '获取失败' };
  }
}

// 获取待审批成员
async function handleGetPendingMembers(data, wxContext) {
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

    const result = await db.collection('users')
      .where({ status: 'pending' })
      .orderBy('created_at', 'desc')
      .limit(20)
      .get();

    return {
      code: 0,
      data: { list: result.data }
    };
  } catch (error) {
    console.error('获取待审批成员失败', error);
    return { code: -1, message: '获取失败' };
  }
}

// 管理商品
async function handleManageProduct(data, wxContext) {
  const openid = wxContext.OPENID;
  const { action, id, data: productData } = data;

  try {
    // 检查权限
    const adminResult = await db.collection('users').where({
      openid,
      role: _.in(['admin', 'leader'])
    }).get();

    if (adminResult.data.length === 0) {
      return { code: -1, message: '没有权限' };
    }

    if (action === 'create') {
      await db.collection('products').add({
        data: {
          ...productData,
          created_at: db.serverDate(),
          updated_at: db.serverDate()
        }
      });
      return { code: 0, message: '创建成功' };
    }

    if (action === 'update') {
      await db.collection('products').doc(id).update({
        data: {
          ...productData,
          updated_at: db.serverDate()
        }
      });
      return { code: 0, message: '更新成功' };
    }

    if (action === 'delete') {
      await db.collection('products').doc(id).remove();
      return { code: 0, message: '删除成功' };
    }

    return { code: -1, message: '未知操作' };
  } catch (error) {
    console.error('管理商品失败', error);
    return { code: -1, message: '操作失败' };
  }
}

// 更新订单状态
async function handleUpdateOrderStatus(data, wxContext) {
  const openid = wxContext.OPENID;
  const { orderId, status } = data;

  try {
    // 检查权限
    const adminResult = await db.collection('users').where({
      openid,
      role: _.in(['admin', 'leader'])
    }).get();

    if (adminResult.data.length === 0) {
      return { code: -1, message: '没有权限' };
    }

    const updateData = {
      status,
      updated_at: db.serverDate()
    };

    if (status === 'shipped') {
      updateData.shipped_at = db.serverDate();
    }

    await db.collection('orders').doc(orderId).update({
      data: updateData
    });

    return { code: 0, message: '更新成功' };
  } catch (error) {
    console.error('更新订单状态失败', error);
    return { code: -1, message: '更新失败' };
  }
}

// 获取订单列表（管理员）
async function handleGetOrders(data, wxContext) {
  const openid = wxContext.OPENID;
  const { page = 1, limit = 10, status } = data;

  try {
    // 检查权限
    const adminResult = await db.collection('users').where({
      openid,
      role: _.in(['admin', 'leader'])
    }).get();

    if (adminResult.data.length === 0) {
      return { code: -1, message: '没有权限' };
    }

    let query = db.collection('orders');

    if (status && status !== 'all') {
      query = query.where({ status });
    }

    const countResult = await query.count();
    const total = countResult.total;

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
    console.error('获取订单列表失败', error);
    return { code: -1, message: '获取失败' };
  }
}