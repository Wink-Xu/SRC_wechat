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
const TEMPLATE_ID = 'DhgaV9rp_Cd9Iwj9OrbHu5MCM-954nzKfInFHsVDpUg';

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
    case 'sendShopOrderNotification':
      return handleSendShopOrderNotification(data, wxContext);
    case 'sendWaitlistPromotion':
      return handleSendWaitlistPromotion(data, wxContext);
    case 'sendMemberApplyNotification':
      return handleSendMemberApplyNotification(data, wxContext);
    case 'sendActivityRegistrationNotification':
      return handleSendActivityRegistrationNotification(data, wxContext);
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
            thing3: { value: '金额: ¥' + totalPrice },
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
            thing3: { value: '新的一天开始啦' },
            thing4: { value: '欢迎下单' },
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
  return {
    code: 0,
    data: {
      templateId: TEMPLATE_ID
    }
  };
}

// 发送周边订单通知给所有团长
async function handleSendShopOrderNotification(data, wxContext) {
  const { orderNo, userName, productName, totalFee } = data;

  try {
    // 获取所有团长
    const userResult = await db.collection('users').where({
      role: 'leader',
      status: 'approved'
    }).field({
      openid: true,
      nickname: true
    }).get();

    const leaders = userResult.data;
    if (leaders.length === 0) {
      return { code: 0, message: '没有团长，跳过通知' };
    }

    const sendPromises = leaders.map(async (leader) => {
      try {
        await cloud.openapi.subscribeMessage.send({
          touser: leader.openid,
          templateId: TEMPLATE_ID,
          page: '/pages/admin-orders/admin-orders',
          data: {
            thing1: { value: ('新周边订单 ' + orderNo).substring(0, 20) },
            thing2: { value: ('买家: ' + (userName || '未知')).substring(0, 20) },
            thing3: { value: totalFee ? '金额: ¥' + totalFee : '金额: ¥0.00' },
            thing4: { value: (productName || '周边商品').substring(0, 20) },
            time5: { value: new Date().toLocaleString('zh-CN') }
          }
        });
        console.log(`已发送周边订单通知给团长：${leader.nickname || leader.openid}`);
      } catch (err) {
        console.error(`发送周边订单通知给 ${leader.openid} 失败:`, err);
      }
    });

    await Promise.all(sendPromises);

    return {
      code: 0,
      message: `已发送通知给 ${leaders.length} 位团长`,
      data: { leaderCount: leaders.length }
    };
  } catch (error) {
    console.error('发送周边订单通知失败', error);
    return { code: -1, message: '发送通知失败: ' + error.message };
  }
}

// 发送候补晋升通知给用户
async function handleSendWaitlistPromotion(data, wxContext) {
  const { openid, activityName, activityId, orderNo } = data;

  try {
    await cloud.openapi.subscribeMessage.send({
      touser: openid,
      templateId: TEMPLATE_ID,
      page: activityId ? '/pages/activity-detail/activity-detail?id=' + activityId : '/pages/activities/activities',
      data: {
        thing1: { value: ('候补成功 - ' + (activityName || '活动')).substring(0, 20) },
        thing2: { value: '您已候补晋升，请尽快完成缴费，否则名额将顺延' },
        thing3: { value: '请及时处理' },
        thing4: { value: (activityName || '').substring(0, 20) },
        time5: { value: new Date().toLocaleString('zh-CN') }
      }
    });

    return { code: 0, message: '已发送晋升通知' };
  } catch (error) {
    console.error('发送候补晋升通知失败', error);
    return { code: -1, message: '发送失败: ' + error.message };
  }
}

// 发送新成员申请通知给所有团长和活动管理员
async function handleSendMemberApplyNotification(data, wxContext) {
  const { nickname, phone } = data;

  try {
    const adminResult = await db.collection('users').where({
      role: _.in(['leader', 'activity_admin']),
      status: 'approved'
    }).field({
      openid: true,
      nickname: true
    }).get();

    const admins = adminResult.data;
    if (admins.length === 0) {
      return { code: 0, message: '没有管理员，跳过通知' };
    }

    const sendPromises = admins.map(async (admin) => {
      try {
        await cloud.openapi.subscribeMessage.send({
          touser: admin.openid,
          templateId: TEMPLATE_ID,
          page: '/pages/admin-members/admin-members?status=pending',
          data: {
            thing1: { value: ('新成员申请: ' + (nickname || '未知')).substring(0, 20) },
            thing2: { value: ('手机号: ' + (phone || '未填写')).substring(0, 20) },
            thing3: { value: '请尽快审批' },
            thing4: { value: '成员管理 → 待审批' },
            time5: { value: new Date().toLocaleString('zh-CN') }
          }
        });
        console.log(`已发送申请通知给管理员：${admin.nickname || admin.openid}`);
      } catch (err) {
        console.error(`发送申请通知给 ${admin.openid} 失败:`, err);
      }
    });

    await Promise.all(sendPromises);

    return {
      code: 0,
      message: `已发送通知给 ${admins.length} 位管理员`,
      data: { adminCount: admins.length }
    };
  } catch (error) {
    console.error('发送成员申请通知失败', error);
    return { code: -1, message: '发送通知失败: ' + error.message };
  }
}

// 发送活动报名通知给所有团长和活动管理员
async function handleSendActivityRegistrationNotification(data, wxContext) {
  const { activityName, userName, activityId } = data;

  try {
    const adminResult = await db.collection('users').where({
      role: _.in(['leader', 'activity_admin']),
      status: 'approved'
    }).field({
      openid: true,
      nickname: true
    }).get();

    const admins = adminResult.data;
    if (admins.length === 0) {
      return { code: 0, message: '没有管理员，跳过通知' };
    }

    const sendPromises = admins.map(async (admin) => {
      try {
        await cloud.openapi.subscribeMessage.send({
          touser: admin.openid,
          templateId: TEMPLATE_ID,
          page: activityId ? '/pages/activity-detail/activity-detail?id=' + activityId : '/pages/activities/activities',
          data: {
            thing1: { value: ('新报名: ' + (activityName || '活动')).substring(0, 20) },
            thing2: { value: ('报名者: ' + (userName || '未知')).substring(0, 20) },
            thing3: { value: '查看详情' },
            thing4: { value: (activityName || '').substring(0, 20) },
            time5: { value: new Date().toLocaleString('zh-CN') }
          }
        });
        console.log(`已发送报名通知给管理员：${admin.nickname || admin.openid}`);
      } catch (err) {
        console.error(`发送报名通知给 ${admin.openid} 失败:`, err);
      }
    });

    await Promise.all(sendPromises);

    return {
      code: 0,
      message: `已发送通知给 ${admins.length} 位管理员`,
      data: { adminCount: admins.length }
    };
  } catch (error) {
    console.error('发送活动报名通知失败', error);
    return { code: -1, message: '发送通知失败: ' + error.message };
  }
}
