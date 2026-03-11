// 数据库初始化脚本 - 模拟数据
// 在微信开发者工具的云开发控制台执行

// ===========================================
// 第一步：创建集合
// 在云开发控制台手动创建以下集合：
// - users
// - activities
// - registrations
// - products
// - orders
// - point_logs
// - settings
// ===========================================

// ===========================================
// 第二步：初始化用户数据
// ===========================================

// 团长 (OpenID 需要替换为实际的团长微信 OpenID)
const leader = {
  _id: 'leader_001',
  openid: 'oXXXX_leader_openid_here', // ← 替换为团长的真实 OpenID
  nickname: '团长 - 张三',
  avatar: '/images/default-avatar.png',
  phone: '13800138000',
  role: 'leader',
  status: 'approved',
  points: 1000,
  created_at: new Date('2024-01-01'),
  updated_at: new Date()
};

// 管理员
const admin1 = {
  _id: 'admin_001',
  openid: 'oXXXX_admin1_openid_here',
  nickname: '管理员 - 李四',
  avatar: '/images/default-avatar.png',
  phone: '13800138001',
  role: 'admin',
  status: 'approved',
  points: 800,
  created_at: new Date('2024-01-02'),
  updated_at: new Date()
};

const admin2 = {
  _id: 'admin_002',
  openid: 'oXXXX_admin2_openid_here',
  nickname: '管理员 - 王五',
  avatar: '/images/default-avatar.png',
  phone: '13800138002',
  role: 'admin',
  status: 'approved',
  points: 650,
  created_at: new Date('2024-01-03'),
  updated_at: new Date()
};

// 普通团员
const member1 = {
  _id: 'member_001',
  openid: 'oXXXX_member1_openid_here',
  nickname: '跑步爱好者 - 小明',
  avatar: '/images/default-avatar.png',
  phone: '13800138003',
  role: 'member',
  status: 'approved',
  points: 320,
  created_at: new Date('2024-01-05'),
  updated_at: new Date()
};

const member2 = {
  _id: 'member_002',
  openid: 'oXXXX_member2_openid_here',
  nickname: '晨跑达人 - 小红',
  avatar: '/images/default-avatar.png',
  phone: '13800138004',
  role: 'member',
  status: 'approved',
  points: 580,
  created_at: new Date('2024-01-06'),
  updated_at: new Date()
};

const member3 = {
  _id: 'member_003',
  openid: 'oXXXX_member3_openid_here',
  nickname: '夜跑小王子',
  avatar: '/images/default-avatar.png',
  phone: '13800138005',
  role: 'member',
  status: 'approved',
  points: 240,
  created_at: new Date('2024-01-07'),
  updated_at: new Date()
};

const member4 = {
  _id: 'member_004',
  openid: 'oXXXX_member4_openid_here',
  nickname: '马拉松爱好者',
  avatar: '/images/default-avatar.png',
  phone: '13800138006',
  role: 'member',
  status: 'approved',
  points: 890,
  created_at: new Date('2024-01-08'),
  updated_at: new Date()
};

// 待审批用户
const pending1 = {
  _id: 'pending_001',
  openid: 'oXXXX_pending1_openid_here',
  nickname: '新用户 - 小赵',
  avatar: '/images/default-avatar.png',
  phone: '13800138007',
  role: 'member',
  status: 'pending',
  points: 0,
  created_at: new Date('2024-03-10'),
  updated_at: new Date()
};

const pending2 = {
  _id: 'pending_002',
  openid: 'oXXXX_pending2_openid_here',
  nickname: '想跑步 - 小钱',
  avatar: '/images/default-avatar.png',
  phone: '13800138008',
  role: 'member',
  status: 'pending',
  points: 0,
  created_at: new Date('2024-03-11'),
  updated_at: new Date()
};

// 执行用户数据插入
// 在云开发控制台执行：
/*
db.collection('users').add({ data: leader })
db.collection('users').add({ data: admin1 })
db.collection('users').add({ data: admin2 })
db.collection('users').add({ data: member1 })
db.collection('users').add({ data: member2 })
db.collection('users').add({ data: member3 })
db.collection('users').add({ data: member4 })
db.collection('users').add({ data: pending1 })
db.collection('users').add({ data: pending2 })
*/

// ===========================================
// 第三步：初始化活动数据
// ===========================================

const activity1 = {
  title: '周末晨跑 - 奥森公园',
  description: '本周日早上 8 点，奥林匹克森林公园南门集合，一起晨跑 10 公里！欢迎新老团员参加。',
  location: '奥林匹克森林公园南门',
  start_time: new Date('2024-03-17 08:00:00'),
  end_time: new Date('2024-03-17 10:00:00'),
  quota: 30,
  points: 20,
  status: 'published',
  registered_count: 15,
  created_by: 'leader_001',
  created_at: new Date('2024-03-01'),
  updated_at: new Date()
};

const activity2 = {
  title: '夜跑活动 - 三里屯夜跑',
  description: '周三晚上 7 点半，三里屯太古里集合，夜跑路线约 8 公里，有路灯安全路线。',
  location: '三里屯太古里',
  start_time: new Date('2024-03-20 19:30:00'),
  end_time: new Date('2024-03-20 21:00:00'),
  quota: 20,
  points: 15,
  status: 'published',
  registered_count: 8,
  created_by: 'admin_001',
  created_at: new Date('2024-03-05'),
  updated_at: new Date()
};

const activity3 = {
  title: 'PB 挑战 - 半马配速跑',
  description: '周六下午 4 点，天坛公园集合，半马配速挑战活动，目标配速 5:30/km。',
  location: '天坛公园东门',
  start_time: new Date('2024-03-23 16:00:00'),
  end_time: new Date('2024-03-23 18:00:00'),
  quota: 15,
  points: 30,
  status: 'published',
  registered_count: 12,
  created_by: 'leader_001',
  created_at: new Date('2024-03-08'),
  updated_at: new Date()
};

const activity4 = {
  title: '越野跑体验 - 香山路线',
  description: '周日上午 7 点，香山公园集合，越野跑体验活动，有一定坡度，适合有基础的跑友。',
  location: '香山公园东门',
  start_time: new Date('2024-03-24 07:00:00'),
  end_time: new Date('2024-03-24 10:00:00'),
  quota: 20,
  points: 35,
  status: 'published',
  registered_count: 18,
  created_by: 'admin_002',
  created_at: new Date('2024-03-10'),
  updated_at: new Date()
};

const activity5 = {
  title: ' LSD 长距离拉练',
  description: '本周日清晨 6 点，集合进行长距离慢跑训练，目标 25 公里，配速 6:30/km。',
  location: '通州大运河森林公园',
  start_time: new Date('2024-03-31 06:00:00'),
  end_time: new Date('2024-03-31 09:00:00'),
  quota: 25,
  points: 50,
  status: 'draft',
  registered_count: 0,
  created_by: 'leader_001',
  created_at: new Date('2024-03-11'),
  updated_at: new Date()
};

// 执行活动数据插入
// 在云开发控制台执行：
/*
db.collection('activities').add({ data: activity1 })
db.collection('activities').add({ data: activity2 })
db.collection('activities').add({ data: activity3 })
db.collection('activities').add({ data: activity4 })
db.collection('activities').add({ data: activity5 })
*/

// ===========================================
// 第四步：初始化商品数据
// ===========================================

const product1 = {
  name: '定制速干 T 恤',
  description: 'SundayRunningClub 定制速干 T 恤，透气舒适，印跑团 Logo，多色可选。',
  image: '/images/default-product.png',
  points_price: 500,
  cash_price: 9900,
  stock: 50,
  status: 'available',
  created_at: new Date('2024-01-01'),
  updated_at: new Date()
};

const product2 = {
  name: '运动腰包',
  description: '防水运动腰包，可装手机、钥匙、能量胶，跑步必备。',
  image: '/images/default-product.png',
  points_price: 300,
  cash_price: 5900,
  stock: 30,
  status: 'available',
  created_at: new Date('2024-01-01'),
  updated_at: new Date()
};

const product3 = {
  name: '硅胶能量手环',
  description: '硅胶材质，防水防汗，多色可选，印有团队口号。',
  image: '/images/default-product.png',
  points_price: 100,
  cash_price: 1900,
  stock: 100,
  status: 'available',
  created_at: new Date('2024-01-01'),
  updated_at: new Date()
};

const product4 = {
  name: '速干运动毛巾',
  description: '速干吸汗，便携收纳袋，跑步后擦汗必备。',
  image: '/images/default-product.png',
  points_price: 200,
  cash_price: 3900,
  stock: 40,
  status: 'available',
  created_at: new Date('2024-01-01'),
  updated_at: new Date()
};

const product5 = {
  name: '不锈钢运动水壶',
  description: '500ml 容量，保温保冷，食品级不锈钢材质。',
  image: '/images/default-product.png',
  points_price: 350,
  cash_price: 6900,
  stock: 25,
  status: 'available',
  created_at: new Date('2024-01-01'),
  updated_at: new Date()
};

const product6 = {
  name: '跑步运动帽',
  description: '速干透气，可调节大小，多色可选。',
  image: '/images/default-product.png',
  points_price: 150,
  cash_price: 2900,
  stock: 60,
  status: 'available',
  created_at: new Date('2024-01-01'),
  updated_at: new Date()
};

const product7 = {
  name: '纪念奖牌（限量版）',
  description: '年度活动纪念奖牌，限量 20 枚，收藏价值高。',
  image: '/images/default-product.png',
  points_price: 800,
  cash_price: 12800,
  stock: 20,
  status: 'available',
  created_at: new Date('2024-01-01'),
  updated_at: new Date()
};

const product8 = {
  name: '加绒团队卫衣',
  description: '秋冬款，加绒保暖，印有跑团 Logo 和口号。',
  image: '/images/default-product.png',
  points_price: 600,
  cash_price: 15900,
  stock: 30,
  status: 'available',
  created_at: new Date('2024-01-01'),
  updated_at: new Date()
};

// 执行商品数据插入
// 在云开发控制台执行：
/*
db.collection('products').add({ data: product1 })
db.collection('products').add({ data: product2 })
db.collection('products').add({ data: product3 })
db.collection('products').add({ data: product4 })
db.collection('products').add({ data: product5 })
db.collection('products').add({ data: product6 })
db.collection('products').add({ data: product7 })
db.collection('products').add({ data: product8 })
*/

// ===========================================
// 第五步：初始化积分记录数据
// ===========================================

const pointLog1 = {
  user_id: 'member_001',
  points: 20,
  type: 'activity',
  related_id: 'activity_001',
  remark: '活动签到',
  created_at: new Date('2024-03-10')
};

const pointLog2 = {
  user_id: 'member_002',
  points: 20,
  type: 'activity',
  related_id: 'activity_001',
  remark: '活动签到',
  created_at: new Date('2024-03-10')
};

// ===========================================
// 快速导入脚本（复制粘贴到云开发控制台执行）
// ===========================================

/*
// 导入用户
db.collection('users').add({ data: {
  openid: 'oXXXX_leader_openid_here',
  nickname: '团长 - 张三',
  avatar: '/images/default-avatar.png',
  phone: '13800138000',
  role: 'leader',
  status: 'approved',
  points: 1000,
  created_at: new Date('2024-01-01'),
  updated_at: new Date()
}});

db.collection('users').add({ data: {
  openid: 'oXXXX_admin1_openid_here',
  nickname: '管理员 - 李四',
  avatar: '/images/default-avatar.png',
  phone: '13800138001',
  role: 'admin',
  status: 'approved',
  points: 800,
  created_at: new Date('2024-01-02'),
  updated_at: new Date()
}});

db.collection('users').add({ data: {
  openid: 'oXXXX_member1_openid_here',
  nickname: '跑步爱好者 - 小明',
  avatar: '/images/default-avatar.png',
  phone: '13800138003',
  role: 'member',
  status: 'approved',
  points: 320,
  created_at: new Date('2024-01-05'),
  updated_at: new Date()
}});

db.collection('users').add({ data: {
  openid: 'oXXXX_pending1_openid_here',
  nickname: '新用户 - 小赵',
  avatar: '/images/default-avatar.png',
  phone: '13800138007',
  role: 'member',
  status: 'pending',
  points: 0,
  created_at: new Date('2024-03-10'),
  updated_at: new Date()
}});

// 导入活动
db.collection('activities').add({ data: {
  title: '周末晨跑 - 奥森公园',
  description: '本周日早上 8 点，奥林匹克森林公园南门集合，一起晨跑 10 公里！',
  location: '奥林匹克森林公园南门',
  start_time: new Date('2024-03-17 08:00:00'),
  end_time: new Date('2024-03-17 10:00:00'),
  quota: 30,
  points: 20,
  status: 'published',
  registered_count: 15,
  created_by: 'leader_001',
  created_at: new Date('2024-03-01'),
  updated_at: new Date()
}});

db.collection('activities').add({ data: {
  title: '夜跑活动 - 三里屯夜跑',
  description: '周三晚上 7 点半，三里屯太古里集合，夜跑路线约 8 公里。',
  location: '三里屯太古里',
  start_time: new Date('2024-03-20 19:30:00'),
  end_time: new Date('2024-03-20 21:00:00'),
  quota: 20,
  points: 15,
  status: 'published',
  registered_count: 8,
  created_by: 'admin_001',
  created_at: new Date('2024-03-05'),
  updated_at: new Date()
}});

// 导入商品
db.collection('products').add({ data: {
  name: '定制速干 T 恤',
  description: 'SundayRunningClub 定制速干 T 恤，透气舒适',
  image: '/images/default-product.png',
  points_price: 500,
  cash_price: 9900,
  stock: 50,
  status: 'available',
  created_at: new Date('2024-01-01'),
  updated_at: new Date()
}});

db.collection('products').add({ data: {
  name: '运动腰包',
  description: '防水运动腰包，可装手机钥匙',
  image: '/images/default-product.png',
  points_price: 300,
  cash_price: 5900,
  stock: 30,
  status: 'available',
  created_at: new Date('2024-01-01'),
  updated_at: new Date()
}});

db.collection('products').add({ data: {
  name: '硅胶能量手环',
  description: '硅胶材质，防水防汗',
  image: '/images/default-product.png',
  points_price: 100,
  cash_price: 1900,
  stock: 100,
  status: 'available',
  created_at: new Date('2024-01-01'),
  updated_at: new Date()
}});
*/

console.log('=== SundayRunningClub 模拟数据脚本 ===');
console.log('请在云开发控制台执行上述命令导入数据');
console.log('主题色：紫色 (#9C27B0)');
console.log('========================================');