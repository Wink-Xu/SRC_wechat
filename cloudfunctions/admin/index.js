// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 初始化首页内容集合（首次保存时调用）
async function ensureHomeContentCollection() {
  try {
    await db.createCollection('home_content');
    console.log('[ensureCollection] 创建 home_content 成功');
  } catch (e) {
    if (e.message && e.message.includes('already exists')) {
      console.log('[ensureCollection] home_content 已存在');
      return;
    }
    // createCollection 可能不可用，尝试通过底层 SDK
    console.log('[ensureCollection] createCollection 不可用:', e.message);
    try {
      const tcb = require('@cloudbase/node-sdk');
      const app = tcb.init({ env: cloud.DYNAMIC_CURRENT_ENV });
      await app.database().createCollection('home_content');
      console.log('[ensureCollection] 通过 @cloudbase/node-sdk 创建成功');
    } catch (tcbErr) {
      console.error('[ensureCollection] 所有方式均失败:', tcbErr.message);
      throw tcbErr;
    }
  }
}

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { action, ...data } = event;

  // 注意：manageProduct 调用时，action 会被 data.action 覆盖
  // 所以需要检查是否是商品操作
  if (['create', 'update', 'delete'].includes(action) && data.data) {
    return handleManageProduct(event, wxContext);
  }

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
    case 'getHomeContent':
      return handleGetHomeContent(data, wxContext);
    case 'saveHomeContent':
      return handleSaveHomeContent(data, wxContext);
    case 'getOrderCounts':
      return handleGetOrderCounts(wxContext);
    default:
      return { code: -1, message: '未知操作: ' + action };
  }
};

// 获取统计数据
async function handleGetStatistics(data, wxContext) {
  const openid = wxContext.OPENID;

  try {
    // 检查用户角色
    const userResult = await db.collection('users').where({ openid }).get();
    if (userResult.data.length === 0) {
      return { code: -1, message: '用户不存在' };
    }
    const user = userResult.data[0];
    const role = user.role;

    // 咖啡管理员只能看咖啡数据
    if (role === 'coffee_admin') {
      // 获取咖啡订单数量
      const coffeeOrderCount = await db.collection('coffee_orders').count();
      return {
        code: 0,
        data: {
          memberCount: 0,
          pendingCount: 0,
          activityCount: 0,
          orderCount: coffeeOrderCount.total
        }
      };
    }

    // 活动管理员和团长可以看全部数据
    if (!['activity_admin', 'leader'].includes(role)) {
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

    // 获取周边订单数量
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
    // 检查权限（团长或活动管理员）
    const adminResult = await db.collection('users').where({
      openid,
      role: _.in(['activity_admin', 'leader'])
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
async function handleManageProduct(event, wxContext) {
  const openid = wxContext.OPENID;
  // 兼容两种调用方式
  const action = event.data?.action || event.action;
  const id = event.data?.id || event.id;
  const productData = event.data?.data || event.data;

  try {
    // 检查权限（团长或活动管理员）
    const adminResult = await db.collection('users').where({
      openid,
      role: _.in(['activity_admin', 'leader'])
    }).get();

    if (adminResult.data.length === 0) {
      return { code: -1, message: '没有权限' };
    }

    if (action === 'create') {
      const result = await db.collection('products').add({
        data: {
          ...productData,
          created_at: db.serverDate(),
          updated_at: db.serverDate()
        }
      });
      return { code: 0, data: { id: result._id }, message: '创建成功' };
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

    return { code: -1, message: '未知操作: ' + action };
  } catch (error) {
    console.error('管理商品失败', error);
    return { code: -1, message: '操作失败: ' + error.message };
  }
}

// 更新订单状态
async function handleUpdateOrderStatus(data, wxContext) {
  const openid = wxContext.OPENID;
  const { orderId, status, express_company, express_no } = data;

  try {
    // 检查权限（团长或活动管理员）
    const adminResult = await db.collection('users').where({
      openid,
      role: _.in(['activity_admin', 'leader'])
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
      if (express_company) updateData.express_company = express_company;
      if (express_no) updateData.express_no = express_no;
    }

    // 确认退款时恢复积分和库存
    if (status === 'refunded') {
      const orderResult = await db.collection('orders').doc(orderId).get();
      const order = orderResult.data;
      if (order) {
        // 恢复积分
        if (order.pay_method === 'points' && order.total_points > 0) {
          await db.collection('users').doc(order.user_id).update({
            data: { points: _.inc(order.total_points) }
          });
          await db.collection('point_logs').add({
            data: {
              user_id: order.user_id,
              points: order.total_points,
              type: 'refund',
              related_id: orderId,
              remark: '退款退回积分',
              created_at: db.serverDate()
            }
          });
        }
        // 恢复库存
        await db.collection('products').doc(order.product_id).update({
          data: { stock: _.inc(order.quantity) }
        });
      }
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
    // 检查权限（团长或活动管理员）
    const adminResult = await db.collection('users').where({
      openid,
      role: _.in(['activity_admin', 'leader'])
    }).get();

    if (adminResult.data.length === 0) {
      return { code: -1, message: '没有权限' };
    }

    let query = db.collection('orders');

    if (status && status !== 'all') {
      if (Array.isArray(status)) {
        query = query.where({ status: _.in(status) });
      } else {
        query = query.where({ status });
      }
    } else {
      // "全部"不显示待付款订单
      query = query.where({ status: _.neq('pending') });
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

// 获取首页内容
async function handleGetHomeContent(data, wxContext) {
  let announcement = null;
  let aboutUs = null;
  let runnerYears = null;

  try {
    const r = await db.collection('home_content').doc('announcement').get();
    announcement = r.data;
  } catch (_) {}

  try {
    const r = await db.collection('home_content').doc('about_us').get();
    aboutUs = r.data;
  } catch (_) {}

  try {
    const r = await db.collection('home_content').doc('runner_years').get();
    runnerYears = r.data;
  } catch (_) {}

  return { code: 0, data: { announcement, aboutUs, runnerYears } };
}

// 保存首页内容（需管理员权限）
async function handleSaveHomeContent(data, wxContext) {
  const openid = wxContext.OPENID;

  try {
    const userResult = await db.collection('users').where({ openid }).get();
    if (userResult.data.length === 0) {
      return { code: -1, message: '用户不存在' };
    }
    const user = userResult.data[0];
    if (!['activity_admin', 'leader'].includes(user.role)) {
      return { code: -1, message: '没有权限' };
    }

    const { type, text, images } = data;
    if (!type || !['announcement', 'about_us', 'runner_years'].includes(type)) {
      return { code: -1, message: '无效的类型' };
    }

    // 尝试创建集合（集合已存在时忽略错误）
    try { await db.createCollection('home_content'); } catch (_) {}

    const updateData = {
      text: text || '',
      updated_at: new Date(),
      updated_by: String(user._id)
    };

    if (type === 'announcement') {
      updateData.image = data.image || '';
    } else if (type === 'about_us') {
      updateData.images = images || [];
    } else if (type === 'runner_years') {
      updateData.images = data.images || [];
      if (data.cover_image !== undefined) {
        updateData.cover_image = data.cover_image;
      }
    }

    // 保存文档
    try {
      await db.collection('home_content').doc(type).set({ data: updateData });
    } catch (setErr) {
      // set 失败时尝试 add（兼容某些环境）
      await db.collection('home_content').add({ data: { _id: type, ...updateData } });
    }

    return { code: 0, message: '保存成功' };
  } catch (error) {
    console.error('保存首页内容失败', JSON.stringify(error));
    const detail = error.errMsg || error.message || '未知错误';
    return { code: -1, message: '保存失败: ' + detail };
  }
}

// 获取各状态订单数量（用于红点）
async function handleGetOrderCounts(wxContext) {
  const openid = wxContext.OPENID;

  try {
    const userResult = await db.collection('users').where({
      openid,
      role: _.in(['activity_admin', 'leader'])
    }).get();

    if (userResult.data.length === 0) {
      return { code: -1, message: '没有权限' };
    }

    const [paid, shipped, refundReview, refundProcess] = await Promise.all([
      db.collection('orders').where({ status: 'paid' }).count(),
      db.collection('orders').where({ status: 'shipped' }).count(),
      db.collection('orders').where({ status: _.in(['refund_requested', 'refund_approved']) }).count(),
      db.collection('orders').where({ status: 'returned' }).count()
    ]);

    return {
      code: 0,
      data: {
        paid: paid.total,
        shipped: shipped.total,
        refund_review: refundReview.total,
        refund_process: refundProcess.total
      }
    };
  } catch (error) {
    console.error('获取订单数量失败', error);
    return { code: -1, message: '获取失败' };
  }
}