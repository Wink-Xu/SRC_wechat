// 云函数入口文件 - 测试用户管理
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 预定义的测试用户
const TEST_USERS = [
  {
    id: 'leader',
    nickname: '团长 - 测试',
    openid: 'test_openid_leader_001',
    role: 'leader',
    status: 'approved',
    phone: '13800138001',
    points: 1000
  },
  {
    id: 'admin',
    nickname: '管理员 - 测试',
    openid: 'test_openid_admin_001',
    role: 'admin',
    status: 'approved',
    phone: '13800138002',
    points: 800
  },
  {
    id: 'member1',
    nickname: '团员 A- 跑步爱好者',
    openid: 'test_openid_member_001',
    role: 'member',
    status: 'approved',
    phone: '13800138003',
    points: 500
  },
  {
    id: 'member2',
    nickname: '团员 B- 晨跑达人',
    openid: 'test_openid_member_002',
    role: 'member',
    status: 'approved',
    phone: '13800138004',
    points: 350
  },
  {
    id: 'member3',
    nickname: '团员 C- 夜跑小王子',
    openid: 'test_openid_member_003',
    role: 'member',
    status: 'approved',
    phone: '13800138005',
    points: 280
  },
  {
    id: 'pending',
    nickname: '待审批 - 新用户',
    openid: 'test_openid_pending_001',
    role: 'member',
    status: 'pending',
    phone: '13800138006',
    points: 0
  },
  {
    id: 'guest',
    nickname: '游客用户',
    openid: 'test_openid_guest_001',
    role: 'member',
    status: 'guest',
    phone: '',
    points: 0
  }
];

// 云函数入口函数
exports.main = async (event, context) => {
  const { action, ...data } = event;

  switch (action) {
    case 'createTestUsers':
      return createTestUsers();
    case 'listTestUsers':
      return listTestUsers();
    case 'switchToUser':
      return switchToUser(data);
    case 'resetTestUsers':
      return resetTestUsers();
    case 'deleteTestUser':
      return deleteTestUser(data);
    default:
      return { code: -1, message: '未知操作' };
  }
};

// 创建所有测试用户
async function createTestUsers() {
  try {
    const results = [];

    for (const testUser of TEST_USERS) {
      // 检查用户是否已存在
      const existingUser = await db.collection('users').where({
        openid: testUser.openid
      }).get();

      if (existingUser.data.length > 0) {
        results.push({
          id: testUser.id,
          status: 'exists',
          message: '用户已存在'
        });
        continue;
      }

      // 创建新用户
      const newUser = {
        openid: testUser.openid,
        nickname: testUser.nickname,
        avatar: '',
        phone: testUser.phone,
        role: testUser.role,
        status: testUser.status,
        points: testUser.points,
        created_at: db.serverDate(),
        updated_at: db.serverDate()
      };

      await db.collection('users').add({
        data: newUser
      });

      results.push({
        id: testUser.id,
        status: 'created',
        message: '创建成功'
      });
    }

    return {
      code: 0,
      data: { results },
      message: `批量创建测试用户完成`
    };
  } catch (error) {
    console.error('创建测试用户失败', error);
    return { code: -1, message: '创建失败：' + error.message };
  }
}

// 列出所有测试用户
async function listTestUsers() {
  try {
    const usersResult = await db.collection('users').where({
      openid: _.in(TEST_USERS.map(u => u.openid))
    }).get();

    const userList = TEST_USERS.map(testUser => {
      const dbUser = usersResult.data.find(u => u.openid === testUser.openid);
      return {
        id: testUser.id,
        nickname: testUser.nickname,
        role: testUser.role,
        status: testUser.status,
        exists: !!dbUser,
        _id: dbUser?._id || null
      };
    });

    return {
      code: 0,
      data: { list: userList }
    };
  } catch (error) {
    console.error('列出测试用户失败', error);
    return { code: -1, message: '查询失败：' + error.message };
  }
}

// 切换到指定测试用户（模拟登录）
async function switchToUser(data) {
  try {
    const { userId } = data;
    const testUser = TEST_USERS.find(u => u.id === userId);

    if (!testUser) {
      return { code: -1, message: '用户不存在' };
    }

    // 检查测试用户是否在数据库中
    const dbUser = await db.collection('users').where({
      openid: testUser.openid
    }).get();

    if (dbUser.data.length === 0) {
      return { code: -1, message: '测试用户未在数据库中，请先创建测试用户' };
    }

    const user = dbUser.data[0];

    return {
      code: 0,
      data: {
        user,
        testUserId: testUser.id
      },
      message: `已切换到用户：${testUser.nickname}`
    };
  } catch (error) {
    console.error('切换用户失败', error);
    return { code: -1, message: '切换失败：' + error.message };
  }
}

// 重置所有测试用户（删除后重新创建）
async function resetTestUsers() {
  try {
    // 删除所有测试用户
    for (const testUser of TEST_USERS) {
      await db.collection('users').where({
        openid: testUser.openid
      }).remove();
    }

    // 重新创建
    return await createTestUsers();
  } catch (error) {
    console.error('重置测试用户失败', error);
    return { code: -1, message: '重置失败：' + error.message };
  }
}

// 删除指定测试用户
async function deleteTestUser(data) {
  try {
    const { userId } = data;
    const testUser = TEST_USERS.find(u => u.id === userId);

    if (!testUser) {
      return { code: -1, message: '用户不存在' };
    }

    await db.collection('users').where({
      openid: testUser.openid
    }).remove();

    return {
      code: 0,
      message: `已删除测试用户：${testUser.nickname}`
    };
  } catch (error) {
    console.error('删除测试用户失败', error);
    return { code: -1, message: '删除失败：' + error.message };
  }
}
