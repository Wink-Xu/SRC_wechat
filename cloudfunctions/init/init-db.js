#!/usr/bin/env node

// 初始化云开发数据库脚本
const cloud = require('wx-server-sdk');

// 初始化云开发环境
cloud.init({
  env: 'cloud1-2gyhe7s5efa4155f'
});

const db = cloud.database();

async function initCollections() {
  const collections = [
    'users',           // 用户信息
    'activities',      // 活动信息
    'registrations',   // 报名信息
    'products',        // 商品信息
    'orders',          // 订单信息
    'point_logs',      // 积分记录
    'reviews'          // 评价
  ];

  console.log('========================================');
  console.log('正在初始化云开发数据库集合...');
  console.log('========================================\n');

  for (const collection of collections) {
    try {
      await db.createCollection(collection);
      console.log(`✅ 创建集合成功：${collection}`);
    } catch (error) {
      if (error.errCode === -502004 || error.message.includes('already exists')) {
        console.log(`⚠️  集合已存在：${collection}`);
      } else {
        console.log(`❌ 创建失败：${collection} - ${error.message}`);
      }
    }
  }

  // 添加示例数据
  console.log('\n========================================');
  console.log('正在添加示例数据...');
  console.log('========================================\n');

  try {
    // 检查是否已有活动
    const activitiesCount = await db.collection('activities').count();
    if (activitiesCount.total === 0) {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

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
      console.log('✅ 添加示例活动成功');
    } else {
      console.log('⚠️  已有活动数据，跳过');
    }

    // 检查是否已有商品
    const productsCount = await db.collection('products').count();
    if (productsCount.total === 0) {
      await db.collection('products').add({
        data: {
          name: '定制速干 T 恤',
          description: 'SundayRunningClub 定制速干 T 恤，透气舒适',
          images: [],
          points_price: 500,
          cash_price: 9900,
          stock: 50,
          status: 'available',
          created_at: db.serverDate(),
          updated_at: db.serverDate()
        }
      });

      await db.collection('products').add({
        data: {
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
      });

      console.log('✅ 添加示例商品成功');
    } else {
      console.log('⚠️  已有商品数据，跳过');
    }
  } catch (error) {
    console.log('添加示例数据失败:', error.message);
  }

  console.log('\n========================================');
  console.log('✅ 初始化完成！');
  console.log('========================================\n');

  process.exit(0);
}

initCollections().catch(err => {
  console.error('❌ 初始化失败:', err);
  process.exit(1);
});
