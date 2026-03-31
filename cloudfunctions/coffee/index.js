// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { action, testOpenid, ...data } = event;
  const openid = testOpenid || wxContext.OPENID;

  switch (action) {
    case 'getProducts':
      return handleGetProducts(data, openid);
    case 'getProductDetail':
      return handleGetProductDetail(data, openid);
    case 'getBalance':
      return handleGetBalance(data, openid);
    case 'createOrder':
      return handleCreateOrder(data, openid);
    case 'payOrderByPoints':
      return handlePayOrderByPoints(data, openid);
    case 'payOrderByCash':
      return handlePayOrderByCash(data, openid);
    case 'payOrderByBalance':
      return handlePayOrderByBalance(data, openid);
    case 'getOrders':
      return handleGetOrders(data, openid);
    case 'getOrderDetail':
      return handleGetOrderDetail(data, openid);
    case 'cancelOrder':
      return handleCancelOrder(data, openid);
    case 'adminGetProducts':
      return handleAdminGetProducts(data, openid);
    case 'adminManageProduct':
      return handleAdminManageProduct(data, openid);
    case 'adminGetOrders':
      return handleAdminGetOrders(data, openid);
    case 'adminUpdateOrderStatus':
      return handleAdminUpdateOrderStatus(data, openid);
    default:
      return { code: -1, message: '未知操作' };
  }
};

// ========== 商品相关 ==========

// 获取商品列表
async function handleGetProducts(data, openid) {
  const { category } = data;

  try {
    let query = db.collection('coffee_products').where({ is_available: true });

    if (category) {
      query = query.where({ category });
    }

    const result = await query.orderBy('sort_order', 'asc').get();

    return {
      code: 0,
      data: { list: result.data }
    };
  } catch (error) {
    console.error('获取咖啡商品失败', error);
    return { code: -1, message: '获取失败' };
  }
}

// 获取商品详情
async function handleGetProductDetail(data, openid) {
  const { id } = data;

  try {
    const result = await db.collection('coffee_products').doc(id).get();
    return {
      code: 0,
      data: { product: result.data }
    };
  } catch (error) {
    console.error('获取商品详情失败', error);
    return { code: -1, message: '获取失败' };
  }
}

// ========== 余额相关 ==========

// 获取用户咖啡余额
async function handleGetBalance(data, openid) {
  try {
    const userResult = await db.collection('users').where({ openid }).get();
    if (userResult.data.length === 0) {
      return { code: -1, message: '用户不存在' };
    }
    const userId = userResult.data[0]._id;

    const balanceResult = await db.collection('coffee_balances').where({ user_id: userId }).get();

    if (balanceResult.data.length === 0) {
      return {
        code: 0,
        data: { americano: 0, any: 0 }
      };
    }

    const balance = balanceResult.data[0];
    return {
      code: 0,
      data: {
        americano: balance.americano_balance || 0,
        any: balance.any_balance || 0
      }
    };
  } catch (error) {
    console.error('获取咖啡余额失败', error);
    return { code: -1, message: '获取失败' };
  }
}

// ========== 订单相关 ==========

// 生成订单号
function generateOrderNo() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `CF${year}${month}${day}${random}`;
}

// 创建订单
async function handleCreateOrder(data, openid) {
  const { items } = data;

  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({ openid }).get();
    if (userResult.data.length === 0) {
      return { code: -1, message: '用户不存在，请先登录' };
    }
    const user = userResult.data[0];
    const userId = user._id;

    if (!items || items.length === 0) {
      return { code: -1, message: '订单项为空' };
    }

    // 计算总价和总杯数
    let totalAmount = 0;
    let totalQuantity = 0;
    for (const item of items) {
      totalAmount += item.price * item.quantity;
      totalQuantity += item.quantity;
    }

    // 生成订单号
    const orderNo = generateOrderNo();

    // 门店信息（固定）
    const storeName = 'And then';
    const storeAddress = '上海爱琴海·缤纷里店';

    // 创建订单
    const orderData = {
      order_no: orderNo,
      user_id: userId,
      user_openid: openid,
      items: items.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        temperature: item.temperature,
        price: item.price,
        quantity: item.quantity,
        category: item.category || ''
      })),
      total_amount: totalAmount,
      total_quantity: totalQuantity,
      payment_type: '',
      points_used: 0,
      cash_paid: 0,
      balance_used: {
        americano: 0,
        any: 0
      },
      status: 'pending',
      store_name: storeName,
      store_address: storeAddress,
      created_at: db.serverDate()
    };

    const orderResult = await db.collection('coffee_orders').add({
      data: orderData
    });

    return {
      code: 0,
      data: { orderId: orderResult._id, orderNo },
      message: '订单创建成功'
    };
  } catch (error) {
    console.error('创建订单失败', error);
    return { code: -1, message: '创建失败' };
  }
}

// 积分支付
async function handlePayOrderByPoints(data, openid) {
  const { orderId } = data;

  try {
    // 获取用户
    const userResult = await db.collection('users').where({ openid }).get();
    const user = userResult.data[0];
    const userId = user._id;
    const userPoints = user.points || 0;

    // 获取订单
    const orderResult = await db.collection('coffee_orders').doc(orderId).get();
    const order = orderResult.data;

    if (order.user_id !== userId) {
      return { code: -1, message: '订单不存在' };
    }

    if (order.status !== 'pending') {
      return { code: -1, message: '订单状态不正确' };
    }

    // 计算所需积分（1元=1积分，价格单位是分）
    const requiredPoints = order.total_amount / 100;

    if (userPoints < requiredPoints) {
      return { code: -1, message: '积分不足' };
    }

    // 扣除积分
    await db.collection('users').doc(userId).update({
      data: { points: _.inc(-requiredPoints) }
    });

    // 记录积分日志
    await db.collection('point_logs').add({
      data: {
        user_id: userId,
        points: -requiredPoints,
        type: 'coffee_order',
        related_id: orderId,
        remark: '咖啡订单支付',
        created_at: db.serverDate()
      }
    });

    // 更新订单状态
    await db.collection('coffee_orders').doc(orderId).update({
      data: {
        status: 'paid',
        payment_type: 'points',
        points_used: requiredPoints,
        paid_at: db.serverDate()
      }
    });

    // 检查是否是充值套餐，如果是则增加用户余额
    await checkAndAddBalance(order);

    return { code: 0, message: '支付成功' };
  } catch (error) {
    console.error('积分支付失败', error);
    return { code: -1, message: '支付失败' };
  }
}

// 现金支付（模拟，实际需要对接微信支付）
async function handlePayOrderByCash(data, openid) {
  const { orderId } = data;

  try {
    const userResult = await db.collection('users').where({ openid }).get();
    const userId = userResult.data[0]._id;

    const orderResult = await db.collection('coffee_orders').doc(orderId).get();
    const order = orderResult.data;

    if (order.user_id !== userId) {
      return { code: -1, message: '订单不存在' };
    }

    if (order.status !== 'pending') {
      return { code: -1, message: '订单状态不正确' };
    }

    // 更新订单状态（模拟支付成功）
    await db.collection('coffee_orders').doc(orderId).update({
      data: {
        status: 'paid',
        payment_type: 'cash',
        cash_paid: order.total_amount,
        paid_at: db.serverDate()
      }
    });

    // 检查是否是充值套餐
    await checkAndAddBalance(order);

    return { code: 0, message: '支付成功' };
  } catch (error) {
    console.error('现金支付失败', error);
    return { code: -1, message: '支付失败' };
  }
}

// 余额支付
async function handlePayOrderByBalance(data, openid) {
  const { orderId } = data;

  try {
    const userResult = await db.collection('users').where({ openid }).get();
    const user = userResult.data[0];
    const userId = user._id;

    const orderResult = await db.collection('coffee_orders').doc(orderId).get();
    const order = orderResult.data;

    if (order.user_id !== userId) {
      return { code: -1, message: '订单不存在' };
    }

    if (order.status !== 'pending') {
      return { code: -1, message: '订单状态不正确' };
    }

    // 获取用户余额
    const balanceResult = await db.collection('coffee_balances').where({ user_id: userId }).get();
    let balance = { americano_balance: 0, any_balance: 0 };
    let balanceDocId = null;

    if (balanceResult.data.length > 0) {
      balance = balanceResult.data[0];
      balanceDocId = balanceResult.data[0]._id;
    }

    // 计算需要使用的余额
    let americanoUsed = 0;
    let anyUsed = 0;
    let remainingQuantity = order.total_quantity;

    // 遍历订单项，按商品类型扣除对应余额
    for (const item of order.items) {
      let itemQty = item.quantity;

      // 美式类商品优先使用美式余额
      if (item.category === 'americano') {
        const canUse = Math.min(balance.americano_balance - americanoUsed, itemQty);
        americanoUsed += canUse;
        itemQty -= canUse;
      }

      // 非手冲商品可使用任意余额
      if (item.category !== 'pour_over' && itemQty > 0) {
        const canUse = Math.min(balance.any_balance - anyUsed, itemQty);
        anyUsed += canUse;
        itemQty -= canUse;
      }

      // 如果还有剩余，需要其他支付方式补足
      if (itemQty > 0) {
        return { code: -1, message: '余额不足，请选择其他支付方式' };
      }
    }

    // 扣除余额
    if (balanceDocId) {
      await db.collection('coffee_balances').doc(balanceDocId).update({
        data: {
          americano_balance: _.inc(-americanoUsed),
          any_balance: _.inc(-anyUsed),
          updated_at: db.serverDate()
        }
      });
    }

    // 更新订单状态
    await db.collection('coffee_orders').doc(orderId).update({
      data: {
        status: 'paid',
        payment_type: 'balance',
        balance_used: {
          americano: americanoUsed,
          any: anyUsed
        },
        paid_at: db.serverDate()
      }
    });

    return { code: 0, message: '支付成功' };
  } catch (error) {
    console.error('余额支付失败', error);
    return { code: -1, message: '支付失败' };
  }
}

// 检查是否是充值套餐，如果是则增加用户余额
async function checkAndAddBalance(order) {
  for (const item of order.items) {
    // 查询商品是否是充值套餐
    try {
      const productResult = await db.collection('coffee_products').doc(item.product_id).get();
      const product = productResult.data;

      if (product.is_recharge && product.recharge_type) {
        // 获取或创建用户余额记录
        const balanceResult = await db.collection('coffee_balances')
          .where({ user_id: order.user_id })
          .get();

        if (balanceResult.data.length === 0) {
          // 创建余额记录
          await db.collection('coffee_balances').add({
            data: {
              user_id: order.user_id,
              americano_balance: product.recharge_type === 'americano' ? product.recharge_count : 0,
              any_balance: product.recharge_type === 'any' ? product.recharge_count : 0,
              updated_at: db.serverDate()
            }
          });
        } else {
          // 更新余额
          const updateData = { updated_at: db.serverDate() };
          if (product.recharge_type === 'americano') {
            updateData.americano_balance = _.inc(product.recharge_count);
          } else if (product.recharge_type === 'any') {
            updateData.any_balance = _.inc(product.recharge_count);
          }
          await db.collection('coffee_balances').doc(balanceResult.data[0]._id).update({
            data: updateData
          });
        }
      }
    } catch (err) {
      console.error('处理充值套餐失败', err);
    }
  }
}

// 获取订单列表
async function handleGetOrders(data, openid) {
  const { page = 1, limit = 10, status } = data;

  try {
    const userResult = await db.collection('users').where({ openid }).get();
    const userId = userResult.data[0]._id;

    let query = db.collection('coffee_orders').where({ user_id: userId });

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

    // 格式化订单列表
    const list = listResult.data.map(order => ({
      ...order,
      formattedTime: formatDate(order.created_at)
    }));

    return {
      code: 0,
      data: { list, total, page, limit }
    };
  } catch (error) {
    console.error('获取订单列表失败', error);
    return { code: -1, message: '获取失败' };
  }
}

// 获取订单详情
async function handleGetOrderDetail(data, openid) {
  const { id } = data;

  try {
    const userResult = await db.collection('users').where({ openid }).get();
    const userId = userResult.data[0]._id;

    const orderResult = await db.collection('coffee_orders').doc(id).get();
    const order = orderResult.data;

    if (order.user_id !== userId) {
      return { code: -1, message: '订单不存在' };
    }

    // 格式化时间
    order.formattedTime = formatDate(order.created_at);
    order.formattedPaidTime = order.paid_at ? formatDate(order.paid_at) : '';

    return {
      code: 0,
      data: { order }
    };
  } catch (error) {
    console.error('获取订单详情失败', error);
    return { code: -1, message: '获取失败' };
  }
}

// 取消订单
async function handleCancelOrder(data, openid) {
  const { orderId } = data;

  try {
    const userResult = await db.collection('users').where({ openid }).get();
    const userId = userResult.data[0]._id;

    const orderResult = await db.collection('coffee_orders').doc(orderId).get();
    const order = orderResult.data;

    if (order.user_id !== userId) {
      return { code: -1, message: '订单不存在' };
    }

    if (order.status !== 'pending') {
      return { code: -1, message: '订单状态不允许取消' };
    }

    await db.collection('coffee_orders').doc(orderId).update({
      data: {
        status: 'cancelled',
        cancelled_at: db.serverDate()
      }
    });

    return { code: 0, message: '订单已取消' };
  } catch (error) {
    console.error('取消订单失败', error);
    return { code: -1, message: '取消失败' };
  }
}

// ========== 管理后台 ==========

// 管理员获取所有商品
async function handleAdminGetProducts(data, openid) {
  const { page = 1, limit = 20 } = data;

  try {
    // 检查管理员权限
    const userResult = await db.collection('users').where({ openid }).get();
    const user = userResult.data[0];
    if (user.role !== 'admin' && user.role !== 'leader') {
      return { code: -1, message: '无权限' };
    }

    const countResult = await db.collection('coffee_products').count();
    const total = countResult.total;

    const skip = (page - 1) * limit;
    const listResult = await db.collection('coffee_products')
      .orderBy('sort_order', 'asc')
      .skip(skip)
      .limit(limit)
      .get();

    return {
      code: 0,
      data: { list: listResult.data, total, page, limit }
    };
  } catch (error) {
    console.error('管理员获取商品失败', error);
    return { code: -1, message: '获取失败' };
  }
}

// 管理员新增/编辑商品
async function handleAdminManageProduct(data, openid) {
  const { id, action: productAction, ...productData } = data;

  try {
    // 检查管理员权限
    const userResult = await db.collection('users').where({ openid }).get();
    const user = userResult.data[0];
    if (user.role !== 'admin' && user.role !== 'leader') {
      return { code: -1, message: '无权限' };
    }

    if (productAction === 'create') {
      // 新增商品
      const newProduct = {
        ...productData,
        created_at: db.serverDate()
      };
      const result = await db.collection('coffee_products').add({ data: newProduct });
      return { code: 0, data: { id: result._id }, message: '创建成功' };
    } else if (productAction === 'update') {
      // 更新商品
      await db.collection('coffee_products').doc(id).update({
        data: {
          ...productData,
          updated_at: db.serverDate()
        }
      });
      return { code: 0, message: '更新成功' };
    } else if (productAction === 'toggle') {
      // 切换上架状态
      const productResult = await db.collection('coffee_products').doc(id).get();
      const currentStatus = productResult.data.is_available;
      await db.collection('coffee_products').doc(id).update({
        data: { is_available: !currentStatus }
      });
      return { code: 0, message: currentStatus ? '已下架' : '已上架' };
    }

    return { code: -1, message: '未知操作' };
  } catch (error) {
    console.error('管理商品失败', error);
    return { code: -1, message: '操作失败' };
  }
}

// 管理员获取所有订单
async function handleAdminGetOrders(data, openid) {
  const { page = 1, limit = 20, status } = data;

  try {
    // 检查管理员权限
    const userResult = await db.collection('users').where({ openid }).get();
    const user = userResult.data[0];
    if (user.role !== 'admin' && user.role !== 'leader') {
      return { code: -1, message: '无权限' };
    }

    let query = db.collection('coffee_orders');

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

    // 获取用户信息
    const userIds = [...new Set(listResult.data.map(o => o.user_id))];
    const usersResult = await db.collection('users').where({
      _id: _.in(userIds)
    }).get();
    const usersMap = {};
    usersResult.data.forEach(u => {
      usersMap[u._id] = u;
    });

    const list = listResult.data.map(order => ({
      ...order,
      formattedTime: formatDate(order.created_at),
      user_nickname: usersMap[order.user_id]?.nickname || '未知用户'
    }));

    return {
      code: 0,
      data: { list, total, page, limit }
    };
  } catch (error) {
    console.error('管理员获取订单失败', error);
    return { code: -1, message: '获取失败' };
  }
}

// 管理员更新订单状态
async function handleAdminUpdateOrderStatus(data, openid) {
  const { orderId, status } = data;

  try {
    // 检查管理员权限
    const userResult = await db.collection('users').where({ openid }).get();
    const user = userResult.data[0];
    if (user.role !== 'admin' && user.role !== 'leader') {
      return { code: -1, message: '无权限' };
    }

    const updateData = { status };
    if (status === 'completed') {
      updateData.completed_at = db.serverDate();
    }

    await db.collection('coffee_orders').doc(orderId).update({
      data: updateData
    });

    return { code: 0, message: '更新成功' };
  } catch (error) {
    console.error('更新订单状态失败', error);
    return { code: -1, message: '更新失败' };
  }
}

// ========== 工具函数 ==========

// 格式化日期
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}