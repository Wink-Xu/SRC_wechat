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
    case 'getProductList':
      return handleGetProductList(data, wxContext);
    case 'getProductDetail':
      return handleGetProductDetail(data, wxContext);
    case 'createOrder':
      return handleCreateOrder(data, wxContext);
    case 'payOrderByPoints':
      return handlePayOrderByPoints(data, wxContext);
    case 'payOrderByWechat':
      return handlePayOrderByWechat(data, wxContext);
    case 'getOrders':
      return handleGetOrders(data, wxContext);
    case 'getOrderDetail':
      return handleGetOrderDetail(data, wxContext);
    case 'cancelOrder':
      return handleCancelOrder(data, wxContext);
    case 'confirmReceipt':
      return handleConfirmReceipt(data, wxContext);
    default:
      return { code: -1, message: '未知操作' };
  }
};

// 获取商品列表
async function handleGetProductList(data, wxContext) {
  const { page = 1, limit = 10, all } = data;

  try {
    let query = db.collection('products');

    // 非管理员只显示上架商品
    if (!all) {
      query = query.where({ status: 'available' });
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
    console.error('获取商品列表失败', error);
    return { code: -1, message: '获取失败' };
  }
}

// 获取商品详情
async function handleGetProductDetail(data, wxContext) {
  const { id } = data;

  try {
    const result = await db.collection('products').doc(id).get();
    return {
      code: 0,
      data: { product: result.data }
    };
  } catch (error) {
    console.error('获取商品详情失败', error);
    return { code: -1, message: '获取失败' };
  }
}

// 创建订单
async function handleCreateOrder(data, wxContext) {
  const openid = wxContext.OPENID;
  const { productId, quantity, payMethod, address } = data;

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

    // 获取商品
    const productResult = await db.collection('products').doc(productId).get();
    const product = productResult.data;

    if (product.status !== 'available') {
      return { code: -1, message: '商品已下架' };
    }

    if (product.stock < quantity) {
      return { code: -1, message: '库存不足' };
    }

    // 计算总价
    const totalPoints = product.points_price ? product.points_price * quantity : 0;
    const totalCash = product.cash_price ? product.cash_price * quantity : 0;

    // 生成订单号
    const orderNo = generateOrderNo();

    // 创建订单
    const orderData = {
      order_no: orderNo,
      user_id: userId,
      product_id: productId,
      product_name: product.name,
      product_image: product.image,
      quantity,
      total_points: totalPoints,
      total_cash: totalCash,
      pay_method: payMethod,
      status: 'pending',
      address,
      created_at: db.serverDate()
    };

    const orderResult = await db.collection('orders').add({
      data: orderData
    });

    return {
      code: 0,
      data: { orderId: orderResult._id },
      message: '订单创建成功'
    };
  } catch (error) {
    console.error('创建订单失败', error);
    return { code: -1, message: '创建失败' };
  }
}

// 积分支付
async function handlePayOrderByPoints(data, wxContext) {
  const openid = wxContext.OPENID;
  const { orderId } = data;

  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({ openid }).get();
    const userId = userResult.data[0]._id;
    const userPoints = userResult.data[0].points;

    // 获取订单
    const orderResult = await db.collection('orders').doc(orderId).get();
    const order = orderResult.data;

    if (order.user_id !== userId) {
      return { code: -1, message: '订单不存在' };
    }

    if (order.status !== 'pending') {
      return { code: -1, message: '订单状态不正确' };
    }

    if (userPoints < order.total_points) {
      return { code: -1, message: '积分不足' };
    }

    // 检查库存
    const productResult = await db.collection('products').doc(order.product_id).get();
    if (productResult.data.stock < order.quantity) {
      return { code: -1, message: '库存不足' };
    }

    // 扣除积分
    await db.collection('users').doc(userId).update({
      data: { points: _.inc(-order.total_points) }
    });

    // 记录积分日志
    await db.collection('point_logs').add({
      data: {
        user_id: userId,
        points: -order.total_points,
        type: 'exchange',
        related_id: orderId,
        remark: '兑换商品',
        created_at: db.serverDate()
      }
    });

    // 扣减库存
    await db.collection('products').doc(order.product_id).update({
      data: { stock: _.inc(-order.quantity) }
    });

    // 更新订单状态
    await db.collection('orders').doc(orderId).update({
      data: {
        status: 'paid',
        paid_at: db.serverDate()
      }
    });

    return { code: 0, message: '支付成功' };
  } catch (error) {
    console.error('积分支付失败', error);
    return { code: -1, message: '支付失败' };
  }
}

// 微信支付
async function handlePayOrderByWechat(data, wxContext) {
  // 微信支付需要配置商户号等信息
  // 这里只返回模拟数据，实际使用时需要对接微信支付API
  return { code: -1, message: '微信支付功能待配置' };
}

// 获取订单列表
async function handleGetOrders(data, wxContext) {
  const openid = wxContext.OPENID;
  const { page = 1, limit = 10, status } = data;

  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({ openid }).get();
    const userId = userResult.data[0]._id;

    let query = db.collection('orders').where({ user_id: userId });

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

// 获取订单详情
async function handleGetOrderDetail(data, wxContext) {
  const openid = wxContext.OPENID;
  const { id } = data;

  try {
    const userResult = await db.collection('users').where({ openid }).get();
    const userId = userResult.data[0]._id;

    const orderResult = await db.collection('orders').doc(id).get();
    const order = orderResult.data;

    if (order.user_id !== userId) {
      return { code: -1, message: '订单不存在' };
    }

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
async function handleCancelOrder(data, wxContext) {
  const openid = wxContext.OPENID;
  const { orderId } = data;

  try {
    const userResult = await db.collection('users').where({ openid }).get();
    const userId = userResult.data[0]._id;

    const orderResult = await db.collection('orders').doc(orderId).get();
    const order = orderResult.data;

    if (order.user_id !== userId) {
      return { code: -1, message: '订单不存在' };
    }

    if (order.status !== 'pending') {
      return { code: -1, message: '订单状态不允许取消' };
    }

    await db.collection('orders').doc(orderId).update({
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

// 确认收货
async function handleConfirmReceipt(data, wxContext) {
  const openid = wxContext.OPENID;
  const { orderId } = data;

  try {
    const userResult = await db.collection('users').where({ openid }).get();
    const userId = userResult.data[0]._id;

    const orderResult = await db.collection('orders').doc(orderId).get();
    const order = orderResult.data;

    if (order.user_id !== userId) {
      return { code: -1, message: '订单不存在' };
    }

    if (order.status !== 'shipped') {
      return { code: -1, message: '订单状态不正确' };
    }

    await db.collection('orders').doc(orderId).update({
      data: {
        status: 'completed',
        completed_at: db.serverDate()
      }
    });

    return { code: 0, message: '已确认收货' };
  } catch (error) {
    console.error('确认收货失败', error);
    return { code: -1, message: '确认失败' };
  }
}

// 生成订单号
function generateOrderNo() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `SRC${year}${month}${day}${random}`;
}