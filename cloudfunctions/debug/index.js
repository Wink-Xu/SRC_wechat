// 云函数入口文件
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
    case 'checkUser':
      return checkUser(event);
    case 'fixUserRole':
      return fixUserRole(event);
    case 'checkActivities':
      return checkActivities();
    default:
      return { code: -1, message: '未知操作' };
  }
};

// 检查用户数据
async function checkUser(event) {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    // 获取当前用户记录
    const userResult = await db.collection('users').where({ openid }).get();

    if (userResult.data.length === 0) {
      return {
        code: 1,
        message: '未找到用户记录',
        data: { openid }
      };
    }

    const user = userResult.data[0];

    // 诊断信息
    const diagnosis = {
      openid: user.openid,
      nickname: user.nickname,
      role: user.role,
      status: user.status,
      isLeader: user.role === 'leader',
      isAdmin: user.role === 'admin',
      isApproved: user.status === 'approved',
      hasLeaderPermission: user.role === 'leader' || user.role === 'admin',
      issues: []
    };

    // 检查问题
    if (user.role !== 'leader' && user.role !== 'admin') {
      diagnosis.issues.push(`角色不是 leader 或 admin，当前为：${user.role}`);
    }
    if (user.status !== 'approved') {
      diagnosis.issues.push(`状态不是 approved，当前为：${user.status}`);
    }

    diagnosis.shouldHaveLeaderPermission = diagnosis.hasLeaderPermission && diagnosis.isApproved;

    return {
      code: 0,
      message: diagnosis.issues.length > 0 ? '发现问题' : '一切正常',
      diagnosis
    };
  } catch (error) {
    console.error('检查失败', error);
    return { code: -1, message: '检查失败：' + error.message };
  }
}

// 修复用户角色为 leader
async function fixUserRole(event) {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    // 检查用户是否存在
    const userResult = await db.collection('users').where({ openid }).get();
    if (userResult.data.length === 0) {
      return { code: -1, message: '未找到用户记录' };
    }

    // 更新角色为 leader，状态为 approved
    await db.collection('users').where({ openid }).update({
      data: {
        role: 'leader',
        status: 'approved',
        updated_at: db.serverDate()
      }
    });

    return {
      code: 0,
      message: '已修复：角色设置为 leader，状态设置为 approved'
    };
  } catch (error) {
    console.error('修复失败', error);
    return { code: -1, message: '修复失败：' + error.message };
  }
}

// 检查活动数据
async function checkActivities() {
  try {
    // 获取所有活动
    const activitiesResult = await db.collection('activities').get();

    return {
      code: 0,
      data: {
        count: activitiesResult.data.length,
        activities: activitiesResult.data
      },
      message: activitiesResult.data.length > 0 ? `找到 ${activitiesResult.data.length} 个活动` : '活动集合为空'
    };
  } catch (error) {
    console.error('检查失败', error);
    return { code: -1, message: '检查失败：' + error.message };
  }
}
