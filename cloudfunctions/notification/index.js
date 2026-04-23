// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 订阅消息模板 ID（需要在微信公众平台申请）
// 申请路径：微信公众平台 -> 功能 -> 订阅通知 -> 添加模板
// 推荐模板：订单支付通知 (模板 ID 需要根据实际申请填写)
const TEMPLATE_ID = 'PPJGcyK4yaRO6FcJFJsrwXoico9heyOdsyBVwjt35-U';

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { action, ...data } = event;

  switch (action) {
    case 'sendOrderNotification':
      return handleSendOrderNotification(data, wxContext);
    case 'sendShopOpenNotification':
      return handleSendShopOpenNotification(data, wxContext);
    case 'requestSubscribe':
      return handleRequestSubscribe(data, wxContext);
    default:
      return { code: -1, message: '未知操作' };
  }
};

// 发送订单通知给咖啡管理员
async function handleSendOrderNotification(data, wxContext) {
  const { orderId, orderNo, items, totalAmount, createTime } = data;

  try {
    // 获取所有咖啡管理员和团长的 openid
    const adminResult = await db.collection('users').where({
      role: _.in(['coffee_admin', 'leader'])
    }).field({
      openid: true,
      nickname: true
    }).get();

    const admins = adminResult.data;
    if (admins.length === 0) {
      return { code: 0, message: '没有咖啡管理员，跳过通知' };
    }

    // 获取订单详情
    const order = await db.collection('coffee_orders').doc(orderId).get();

    // 构造消息内容
    const itemName = order.data.items.map(item => item.product_name).join(', ');
    const totalPrice = (totalAmount / 100).toFixed(2);

    // 发送订阅消息给每个管理员
    const sendPromises = admins.map(async (admin) => {
      try {
        await cloud.openapi.subscribeMessage.send({
          touser: admin.openid,
          templateId: TEMPLATE_ID,
          page: '/pages/admin-coffee-orders/admin-coffee-orders',
          data: {
            thing1: { value: itemName.length > 20 ? itemName.substring(0, 20) + '...' : itemName },
            thing2: { value: orderNo },
            amount3: { value: totalPrice },
            thing4: { value: '新订单待处理' },
            time5: { value: createTime || new Date().toLocaleString('zh-CN') }
          }
        });
        console.log(`已发送通知给管理员：${admin.nickname || admin.openid}`);
      } catch (err) {
        console.error(`发送通知给 ${admin.openid} 失败:`, err);
      }
    });

    await Promise.all(sendPromises);

    return {
      code: 0,
      message: `已发送通知给 ${admins.length} 位管理员`,
      data: { adminCount: admins.length }
    };
  } catch (error) {
    console.error('发送订单通知失败', error);
    return { code: -1, message: '发送通知失败：' + error.message };
  }
}

// 发送店铺开张通知给咖啡管理员
async function handleSendShopOpenNotification(data, wxContext) {
  try {
    // 获取所有咖啡管理员和团长的 openid
    const adminResult = await db.collection('users').where({
      role: _.in(['coffee_admin', 'leader'])
    }).field({
      openid: true,
      nickname: true
    }).get();

    const admins = adminResult.data;
    if (admins.length === 0) {
      return { code: 0, message: '没有咖啡管理员，跳过通知' };
    }

    const openTime = new Date().toLocaleString('zh-CN');

    // 发送订阅消息给每个管理员
    const sendPromises = admins.map(async (admin) => {
      try {
        await cloud.openapi.subscribeMessage.send({
          touser: admin.openid,
          templateId: TEMPLATE_ID,
          page: '/pages/admin-coffee-orders/admin-coffee-orders',
          data: {
            thing1: { value: '店铺已开始营业' },
            thing2: { value: '营业通知' },
            amount3: { value: '-' },
            thing4: { value: '新的一天开始啦' },
            time5: { value: openTime }
          }
        });
        console.log(`已发送开张通知给管理员：${admin.nickname || admin.openid}`);
      } catch (err) {
        console.error(`发送开张通知给 ${admin.openid} 失败:`, err);
      }
    });

    await Promise.all(sendPromises);

    return {
      code: 0,
      message: `已发送开张通知给 ${admins.length} 位管理员`,
      data: { adminCount: admins.length }
    };
  } catch (error) {
    console.error('发送店铺开张通知失败', error);
    return { code: -1, message: '发送通知失败：' + error.message };
  }
}

// 管理员请求订阅消息
async function handleRequestSubscribe(data, wxContext) {
  // 这个函数主要是在前端调用 wx.requestSubscribeMessage
  // 云函数只需要返回模板 ID 即可
  return {
    code: 0,
    data: {
      templateId: TEMPLATE_ID
    }
  };
}
