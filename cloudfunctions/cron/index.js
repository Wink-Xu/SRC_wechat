// 定时任务云函数
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 云函数入口函数
exports.main = async (event, context) => {
  const { action } = event;

  switch (action) {
    case 'autoConfirmReceipt':
      return handleAutoConfirmReceipt();
    case 'expirePayments':
      return handleExpirePayments();
    default:
      return { code: -1, message: '未知操作' };
  }
};

// 自动确认收货：将已发货超过7天的订单自动标记为已完成
async function handleAutoConfirmReceipt() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  try {
    const result = await db.collection('orders')
      .where({
        status: 'shipped',
        shipped_at: _.lte(sevenDaysAgo)
      })
      .get();

    const orders = result.data || [];

    if (orders.length === 0) {
      return { code: 0, data: { completedCount: 0 }, message: '没有需要自动确认的订单' };
    }

    const updatePromises = orders.map(order =>
      db.collection('orders').doc(order._id).update({
        data: {
          status: 'completed',
          completed_at: db.serverDate(),
          auto_completed: true
        }
      })
    );

    await Promise.all(updatePromises);

    console.log(`自动确认收货完成: ${orders.length} 条订单`);

    return {
      code: 0,
      data: { completedCount: orders.length },
      message: `已自动确认 ${orders.length} 条订单`
    };
  } catch (error) {
    console.error('自动确认收货失败', error);
    return { code: -1, message: error.message };
  }
}

// 处理过期未支付的候补晋升缴费
async function handleExpirePayments() {
  const now = new Date();

  try {
    // 查找所有已过期还未支付的 pending_payment 记录
    const result = await db.collection('registrations')
      .where({
        status: 'pending_payment',
        payment_deadline: _.lte(now)
      })
      .get();

    const expiredRegs = result.data || [];

    if (expiredRegs.length === 0) {
      return { code: 0, data: { expiredCount: 0 }, message: '没有过期的待支付记录' };
    }

    let processedCount = 0;

    for (const reg of expiredRegs) {
      try {
        // 取消过期记录
        await db.collection('registrations').doc(reg._id).update({
          data: {
            status: 'cancelled',
            updated_at: db.serverDate()
          }
        });

        console.log(`[过期缴费] 已取消 ${reg._id}（用户 ${reg.user_id}）的待支付名额`);

        // 尝试递补下一位候补
        const activityId = reg.activity_id;
        const activitySnap = await db.collection('activities').doc(activityId).get();
        const activityData = activitySnap.data;
        if (!activityData) continue;

        const waitlistResult = await db.collection('registrations')
          .where({
            activity_id: activityId,
            status: 'waitlisted'
          })
          .orderBy('created_at', 'asc')
          .limit(1)
          .get();

        if (waitlistResult.data.length === 0) continue;

        const promoted = waitlistResult.data[0];
        const isCashFee = activityData.registration_fee_type === 'cash' && activityData.registration_fee > 0;

        if (isCashFee) {
          const paymentDeadline = new Date();
          paymentDeadline.setMinutes(paymentDeadline.getMinutes() + 30);

          const orderNo = `ACT${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

          await db.collection('registrations').doc(promoted._id).update({
            data: {
              status: 'pending_payment',
              check_in_status: 'pending_payment',
              order_no: orderNo,
              order_amount: activityData.registration_fee,
              payment_deadline: paymentDeadline,
              updated_at: db.serverDate()
            }
          });

          await db.collection('activities').doc(activityId).update({
            data: {
              waitlist_count: _.inc(-1),
              updated_at: db.serverDate()
            }
          });

          // 发送通知
          try {
            const promotedUser = await db.collection('users').doc(promoted.user_id).get();
            if (promotedUser.data && promotedUser.data.openid) {
              await cloud.callFunction({
                name: 'notification',
                data: {
                  action: 'sendWaitlistPromotion',
                  openid: promotedUser.data.openid,
                  activityName: activityData.title,
                  activityId: activityId,
                  orderNo: orderNo
                }
              });
            }
          } catch (notifyErr) {
            console.error('[过期缴费-递补] 发送通知失败:', notifyErr);
          }

          console.log('[过期缴费-递补] 用户', promoted.user_id, '从候补转为待支付（30分钟时限）');
        } else {
          await db.collection('registrations').doc(promoted._id).update({
            data: {
              status: 'registered',
              check_in_status: 'registered',
              updated_at: db.serverDate()
            }
          });

          await db.collection('activities').doc(activityId).update({
            data: {
              registered_count: _.inc(1),
              waitlist_count: _.inc(-1),
              updated_at: db.serverDate()
            }
          });

          console.log('[过期缴费-递补] 用户', promoted.user_id, '从候补转为正式报名');
        }

        processedCount++;
      } catch (err) {
        console.error('[过期缴费] 处理记录失败:', reg._id, err);
      }
    }

    return {
      code: 0,
      data: { expiredCount: processedCount },
      message: `已处理 ${processedCount} 条过期待支付记录`
    };
  } catch (error) {
    console.error('处理过期缴费失败', error);
    return { code: -1, message: error.message };
  }
}
