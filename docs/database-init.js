// 数据库初始化脚本
// 在微信开发者工具的云开发控制台中执行

// 1. 创建集合
// 需要在云开发控制台手动创建以下集合：
// - users
// - activities
// - registrations
// - products
// - orders
// - point_logs
// - settings

// 2. 设置初始管理员（团长）
// 将下面的 openid 替换为团长的真实 openid
const leaderData = {
  openid: 'your-leader-openid', // 替换为团长的openid
  nickname: '团长',
  avatar: '',
  phone: '13800138000',
  role: 'leader',
  status: 'approved',
  points: 0,
  created_at: new Date(),
  updated_at: new Date()
};

// 在云开发控制台执行：
// db.collection('users').add({ data: leaderData })

// 3. 创建示例活动
const sampleActivity = {
  title: '周末晨跑',
  description: '本周日上午集合，一起晨跑10公里',
  location: '奥林匹克森林公园南门',
  start_time: new Date('2024-01-07 08:00:00'),
  end_time: new Date('2024-01-07 10:00:00'),
  quota: 20,
  points: 10,
  status: 'published',
  registered_count: 0,
  created_at: new Date(),
  updated_at: new Date()
};

// 在云开发控制台执行：
// db.collection('activities').add({ data: sampleActivity })

// 4. 创建示例商品
const sampleProduct = {
  name: '跑团定制T恤',
  description: 'SundayRunningClub 定制速干T恤，透气舒适',
  image: '',
  points_price: 500,
  cash_price: 9900, // 单位：分
  stock: 50,
  status: 'available',
  created_at: new Date(),
  updated_at: new Date()
};

// 在云开发控制台执行：
// db.collection('products').add({ data: sampleProduct })

// 5. 设置数据库权限规则
// 在云开发控制台的数据库设置中，将所有集合的权限设置为：
// - 读权限：所有用户可读
// - 写权限：仅创建者及管理员可写

console.log('数据库初始化脚本已准备就绪');
console.log('请在云开发控制台手动执行相关操作');