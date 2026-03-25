// 云函数入口文件 - 初始化数据库集合
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();

  try {
    // 注意：初始化时 users 集合可能不存在，所以跳过权限检查
    // 这是故意设计的，允许首次用户调用初始化

    const results = {};

    // 需要创建的集合列表
    const collections = [
      'users',           // 用户信息
      'activities',      // 活动信息
      'registrations',   // 报名信息
      'products',        // 商品信息
      'orders',          // 订单信息
      'point_logs',      // 积分记录
      'reviews'          // 评价
    ];

    console.log('[初始化] 开始创建数据库集合...');

    // 尝试创建每个集合
    for (const collection of collections) {
      try {
        // 创建集合（如果已存在会抛出错误，忽略即可）
        await db.createCollection(collection);
        results[collection] = 'created';
        console.log(`[初始化] 创建集合 ${collection} 成功`);
      } catch (error) {
        if (error.errCode === -502004 || error.message.includes('already exists')) {
          // 集合已存在
          results[collection] = 'exists';
          console.log(`[初始化] 集合 ${collection} 已存在`);
        } else {
          results[collection] = 'error: ' + error.message;
          console.error(`[初始化] 创建集合 ${collection} 失败:`, error);
        }
      }
    }

    // 初始化一些默认数据（可选）
    await initializeDefaultData();

    console.log('[初始化] 初始化完成');

    return {
      code: 0,
      data: {
        collections: results,
        message: '初始化完成'
      }
    };
  } catch (error) {
    console.error('[初始化] 初始化失败', error);
    return {
      code: -1,
      message: '初始化失败：' + error.message
    };
  }
};

// 初始化默认数据
async function initializeDefaultData() {
  try {
    // 检查是否已有活动数据
    const activitiesCount = await db.collection('activities').count();

    if (activitiesCount.total === 0) {
      // 添加示例活动
      const now = new Date();
      const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 天后

      await db.collection('activities').add({
        data: {
          title: '周末晨跑 - 奥森公园',
          description: '本周日早上 8 点，奥林匹克森林公园南门集合，一起晨跑 10 公里！',
          location: '奥林匹克森林公园南门',
          run_type: 'road',
          dress_code: '统一穿跑团队服',
          start_time: futureDate,
          end_time: new Date(futureDate.getTime() + 2 * 60 * 60 * 1000),
          registration_deadline: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000),
          quota: 30,
          points: 20,
          status: 'published',
          registered_count: 0,
          check_in_count: 0,
          check_in_enabled: true,
          cover_image: '',
          photos: [],
          created_by: 'system',
          created_at: db.serverDate(),
          updated_at: db.serverDate()
        }
      });

      console.log('添加示例活动成功');
    }

    // 检查是否已有商品数据
    const productsCount = await db.collection('products').count();

    if (productsCount.total === 0) {
      // 添加示例商品
      const defaultProducts = [
        {
          name: '定制速干 T 恤',
          description: 'SundayRunningClub 定制速干 T 恤，透气舒适',
          images: [],
          points_price: 500,
          cash_price: 9900,
          stock: 50,
          status: 'available',
          created_at: db.serverDate(),
          updated_at: db.serverDate()
        },
        {
          name: '运动腰包',
          description: '防水运动腰包，可装手机钥匙',
          images: [],
          points_price: 300,
          cash_price: 5900,
          stock: 30,
          status: 'available',
          created_at: db.serverDate(),
          updated_at: db.serverDate()
        }
      ];

      for (const product of defaultProducts) {
        await db.collection('products').add({
          data: product
        });
      }

      console.log('添加示例商品成功');
    }
  } catch (error) {
    console.error('初始化默认数据失败:', error);
  }
}
