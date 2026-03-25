// 云函数入口文件 - 测试数据管理
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 测试用户 OPENID 映射
const TEST_USER_OPENIDS = {
  leader: 'test_openid_leader_001',
  admin: 'test_openid_admin_001',
  member1: 'test_openid_member_001',
  member2: 'test_openid_member_002',
  member3: 'test_openid_member_003',
  pending: 'test_openid_pending_001',
  guest: 'test_openid_guest_001'
};

// 云函数入口函数
exports.main = async (event, context) => {
  const { action, ...data } = event;

  switch (action) {
    case 'initTestData':
      return initTestData(data);
    case 'createTestActivities':
      return createTestActivities();
    case 'createTestProducts':
      return createTestProducts();
    case 'resetAllData':
      return resetAllData();
    case 'cleanupAllData':
      return cleanupAllData();
    default:
      return { code: -1, message: '未知操作' };
  }
};

// 初始化测试数据
async function initTestData(data) {
  try {
    const { type = 'all' } = data;
    const results = {};

    if (type === 'all' || type === 'activities') {
      const activityResult = await createTestActivities();
      results.activities = activityResult;
    }

    if (type === 'all' || type === 'products') {
      const productResult = await createTestProducts();
      results.products = productResult;
    }

    return {
      code: 0,
      data: results,
      message: '测试数据初始化完成'
    };
  } catch (error) {
    console.error('初始化测试数据失败', error);
    return { code: -1, message: '初始化失败：' + error.message };
  }
}

// 创建测试活动
async function createTestActivities() {
  try {
    const now = new Date();
    const activities = [
      // 正在报名的活动
      {
        title: '周末晨跑 - 奥森公园',
        description: '本周日早上 8 点，奥林匹克森林公园南门集合，一起晨跑 10 公里！',
        location: '奥林匹克森林公园南门',
        run_type: 'road',
        dress_code: '统一穿跑团队服',
        start_time: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 天后
        end_time: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        registration_deadline: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000), // 1 天后截止
        quota: 30,
        points: 20,
        status: 'published',
        registered_count: 5,
        check_in_count: 0,
        check_in_enabled: true,
        cover_image: '',
        photos: [],
        created_by: TEST_USER_OPENIDS.leader
      },
      // 正在进行的活动（可签到）
      {
        title: '周三夜跑 - 朝阳公园',
        description: '周三晚上 7 点半，朝阳公园北门集合，5 公里夜跑。',
        location: '朝阳公园北门',
        run_type: 'road',
        dress_code: '穿着带反光条装备',
        start_time: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 小时前开始
        end_time: new Date(now.getTime() + 1 * 60 * 60 * 1000), // 1 小时后结束
        registration_deadline: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 小时前截止
        quota: 20,
        points: 15,
        status: 'ongoing',
        registered_count: 12,
        check_in_count: 8,
        check_in_enabled: true,
        cover_image: '',
        photos: [],
        created_by: TEST_USER_OPENIDS.admin
      },
      // 往期活动
      {
        title: '新春第一跑 - 圆明园',
        description: '新年首次活动，圆明园冰雪主题跑。',
        location: '圆明园南门',
        run_type: 'road',
        dress_code: '统一穿红色队服',
        start_time: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 天前
        end_time: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        registration_deadline: new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000),
        quota: 40,
        points: 25,
        status: 'ended',
        registered_count: 38,
        check_in_count: 35,
        check_in_enabled: false,
        cover_image: '',
        photos: [],
        created_by: TEST_USER_OPENIDS.leader
      },
      {
        title: '元宵夜跑 - 前门大街',
        description: '元宵节特别活动，夜跑前门大街。',
        location: '前门大街',
        run_type: 'road',
        dress_code: '穿着带反光条装备',
        start_time: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000),
        end_time: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000 + 1.5 * 60 * 60 * 1000),
        registration_deadline: new Date(now.getTime() - 26 * 24 * 60 * 60 * 1000),
        quota: 25,
        points: 20,
        status: 'ended',
        registered_count: 22,
        check_in_count: 20,
        check_in_enabled: false,
        cover_image: '',
        photos: [],
        created_by: TEST_USER_OPENIDS.admin
      },
      {
        title: '春日越野 - 慕田峪长城',
        description: '春季越野跑，长城脚下。',
        location: '慕田峪长城景区',
        run_type: 'trail',
        dress_code: '穿越野跑鞋',
        start_time: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
        end_time: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
        registration_deadline: new Date(now.getTime() - 16 * 24 * 60 * 60 * 1000),
        quota: 20,
        points: 40,
        status: 'ended',
        registered_count: 20,
        check_in_count: 18,
        check_in_enabled: false,
        cover_image: '',
        photos: [],
        created_by: TEST_USER_OPENIDS.leader
      }
    ];

    const results = [];

    for (const activity of activities) {
      // 检查是否已存在同名活动
      const existing = await db.collection('activities').where({
        title: activity.title
      }).get();

      if (existing.data.length > 0) {
        results.push({ title: activity.title, status: 'exists' });
        continue;
      }

      activity.created_at = db.serverDate();
      activity.updated_at = db.serverDate();

      await db.collection('activities').add({
        data: activity
      });

      results.push({ title: activity.title, status: 'created' });
    }

    return {
      code: 0,
      data: { created: results.filter(r => r.status === 'created').length },
      message: '测试活动创建完成'
    };
  } catch (error) {
    console.error('创建测试活动失败', error);
    return { code: -1, message: '创建失败：' + error.message };
  }
}

// 创建测试商品
async function createTestProducts() {
  try {
    const products = [
      {
        name: '定制速干 T 恤',
        description: 'SundayRunningClub 定制速干 T 恤，透气舒适',
        images: [],
        points_price: 500,
        cash_price: 9900,
        stock: 50,
        status: 'available'
      },
      {
        name: '运动腰包',
        description: '防水运动腰包，可装手机钥匙',
        images: [],
        points_price: 300,
        cash_price: 5900,
        stock: 30,
        status: 'available'
      },
      {
        name: '硅胶能量手环',
        description: '硅胶材质，防水防汗',
        images: [],
        points_price: 100,
        cash_price: 1900,
        stock: 100,
        status: 'available'
      },
      {
        name: '速干运动毛巾',
        description: '速干吸汗，便携收纳袋',
        images: [],
        points_price: 200,
        cash_price: 3900,
        stock: 40,
        status: 'available'
      },
      {
        name: '不锈钢运动水壶',
        description: '500ml 容量，保温保冷',
        images: [],
        points_price: 350,
        cash_price: 6900,
        stock: 25,
        status: 'available'
      },
      {
        name: '跑步运动帽',
        description: '速干透气，可调节',
        images: [],
        points_price: 150,
        cash_price: 2900,
        stock: 60,
        status: 'available'
      }
    ];

    const results = [];

    for (const product of products) {
      // 检查是否已存在同名商品
      const existing = await db.collection('products').where({
        name: product.name
      }).get();

      if (existing.data.length > 0) {
        results.push({ name: product.name, status: 'exists' });
        continue;
      }

      product.created_at = db.serverDate();
      product.updated_at = db.serverDate();

      await db.collection('products').add({
        data: product
      });

      results.push({ name: product.name, status: 'created' });
    }

    return {
      code: 0,
      data: { created: results.filter(r => r.status === 'created').length },
      message: '测试商品创建完成'
    };
  } catch (error) {
    console.error('创建测试商品失败', error);
    return { code: -1, message: '创建失败：' + error.message };
  }
}

// 重置所有测试数据（清理后重新创建）
async function resetAllData() {
  try {
    // 先清理
    await cleanupAllData();

    // 重新创建
    const activityResult = await createTestActivities();
    const productResult = await createTestProducts();

    return {
      code: 0,
      data: {
        activities: activityResult,
        products: productResult
      },
      message: '所有测试数据重置完成'
    };
  } catch (error) {
    console.error('重置所有数据失败', error);
    return { code: -1, message: '重置失败：' + error.message };
  }
}

// 清理所有测试数据（删除活动和商品）
async function cleanupAllData() {
  try {
    // 删除所有活动
    const activities = await db.collection('activities').get();
    for (const activity of activities.data) {
      await db.collection('activities').doc(activity._id).remove();
    }

    // 删除所有商品
    const products = await db.collection('products').get();
    for (const product of products.data) {
      await db.collection('products').doc(product._id).remove();
    }

    // 删除所有订单
    const orders = await db.collection('orders').get();
    for (const order of orders.data) {
      await db.collection('orders').doc(order._id).remove();
    }

    // 删除所有积分记录
    const pointLogs = await db.collection('point_logs').get();
    for (const log of pointLogs.data) {
      await db.collection('point_logs').doc(log._id).remove();
    }

    // 删除所有报名记录
    const registrations = await db.collection('registrations').get();
    for (const reg of registrations.data) {
      await db.collection('registrations').doc(reg._id).remove();
    }

    return {
      code: 0,
      message: '已清理所有测试数据'
    };
  } catch (error) {
    console.error('清理测试数据失败', error);
    return { code: -1, message: '清理失败：' + error.message };
  }
}
