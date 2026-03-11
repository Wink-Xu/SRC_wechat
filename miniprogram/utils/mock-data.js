// utils/mock-data.js - 本地模拟数据（无需云开发）

// ============================================
// 角色切换配置
// 修改 CURRENT_ROLE 来切换登录用户身份：
// 'member' - 普通团员
// 'leader' - 团长
// 'admin'  - 管理员
// ============================================
const CURRENT_ROLE = 'member';

// 模拟用户数据
const users = {
  // 团员
  member: {
    _id: 'mock_user_001',
    openid: 'mock_openid',
    nickname: '测试用户',
    avatar: '/images/default-avatar.png',
    phone: '13800138000',
    role: 'member',
    status: 'approved',
    points: 500
  },
  // 团长
  leader: {
    _id: 'leader_001',
    openid: 'mock_leader_openid',
    nickname: '团长 - 张三',
    avatar: '/images/default-avatar.png',
    phone: '13800138000',
    role: 'leader',
    status: 'approved',
    points: 1000
  },
  // 管理员
  admin: {
    _id: 'admin_001',
    openid: 'mock_admin_openid',
    nickname: '管理员 - 李四',
    avatar: '/images/default-avatar.png',
    phone: '13800138001',
    role: 'admin',
    status: 'approved',
    points: 800
  }
};

// 当前登录用户（根据角色切换）
const currentUser = users[CURRENT_ROLE] || users.member;

// 模拟活动列表
const activities = [
  {
    _id: 'activity_001',
    title: '周末晨跑 - 奥森公园',
    description: '本周日早上 8 点，奥林匹克森林公园南门集合，一起晨跑 10 公里！',
    location: '奥林匹克森林公园南门',
    run_type: 'road',
    dress_code: '统一穿跑团队服',
    start_time: '2024-03-17 08:00:00',
    end_time: '2024-03-17 10:00:00',
    registration_deadline: '2024-03-16',
    quota: 30,
    points: 20,
    status: 'published',
    registered_count: 15,
    created_by: 'leader_001'
  },
  {
    _id: 'activity_002',
    title: '夜跑活动 - 三里屯',
    description: '周三晚上 7 点半，三里屯太古里集合，夜跑路线约 8 公里。',
    location: '三里屯太古里',
    run_type: 'road',
    dress_code: '穿着带反光条的运动装备',
    start_time: '2024-03-20 19:30:00',
    end_time: '2024-03-20 21:00:00',
    registration_deadline: '2024-03-20',
    quota: 20,
    points: 15,
    status: 'published',
    registered_count: 8,
    created_by: 'admin_001'
  },
  {
    _id: 'activity_003',
    title: 'PB 挑战 - 半马配速跑',
    description: '周六下午 4 点，天坛公园集合，半马配速挑战活动。',
    location: '天坛公园东门',
    run_type: 'road',
    dress_code: '',
    start_time: '2024-03-23 16:00:00',
    end_time: '2024-03-23 18:00:00',
    registration_deadline: '2024-03-22',
    quota: 15,
    points: 30,
    status: 'published',
    registered_count: 12,
    created_by: 'leader_001'
  },
  {
    _id: 'activity_004',
    title: '越野跑体验 - 香山',
    description: '周日上午 7 点，香山公园集合，越野跑体验活动。',
    location: '香山公园东门',
    run_type: 'trail',
    dress_code: '建议穿越野跑鞋',
    start_time: '2024-03-24 07:00:00',
    end_time: '2024-03-24 10:00:00',
    registration_deadline: '2024-03-23',
    quota: 20,
    points: 35,
    status: 'published',
    registered_count: 18,
    created_by: 'admin_002'
  }
];

// 模拟商品列表
const products = [
  {
    _id: 'product_001',
    name: '定制速干 T 恤',
    description: 'SundayRunningClub 定制速干 T 恤，透气舒适',
    image: '/images/default-product.png',
    points_price: 500,
    cash_price: 9900,
    stock: 50,
    status: 'available'
  },
  {
    _id: 'product_002',
    name: '运动腰包',
    description: '防水运动腰包，可装手机钥匙',
    image: '/images/default-product.png',
    points_price: 300,
    cash_price: 5900,
    stock: 30,
    status: 'available'
  },
  {
    _id: 'product_003',
    name: '硅胶能量手环',
    description: '硅胶材质，防水防汗',
    image: '/images/default-product.png',
    points_price: 100,
    cash_price: 1900,
    stock: 100,
    status: 'available'
  },
  {
    _id: 'product_004',
    name: '速干运动毛巾',
    description: '速干吸汗，便携收纳袋',
    image: '/images/default-product.png',
    points_price: 200,
    cash_price: 3900,
    stock: 40,
    status: 'available'
  },
  {
    _id: 'product_005',
    name: '不锈钢运动水壶',
    description: '500ml 容量，保温保冷',
    image: '/images/default-product.png',
    points_price: 350,
    cash_price: 6900,
    stock: 25,
    status: 'available'
  },
  {
    _id: 'product_006',
    name: '跑步运动帽',
    description: '速干透气，可调节',
    image: '/images/default-product.png',
    points_price: 150,
    cash_price: 2900,
    stock: 60,
    status: 'available'
  }
];

// 模拟积分记录
const pointLogs = [
  { _id: 'log_001', user_id: 'mock_user_001', points: 20, type: 'activity', remark: '活动签到', created_at: '2024-03-10 09:00:00' },
  { _id: 'log_002', user_id: 'mock_user_001', points: 20, type: 'activity', remark: '活动签到', created_at: '2024-03-03 09:00:00' },
  { _id: 'log_003', user_id: 'mock_user_001', points: 20, type: 'activity', remark: '活动签到', created_at: '2024-02-25 09:00:00' },
  { _id: 'log_004', user_id: 'mock_user_001', points: 20, type: 'activity', remark: '活动签到', created_at: '2024-02-18 09:00:00' },
  { _id: 'log_005', user_id: 'mock_user_001', points: 20, type: 'activity', remark: '活动签到', created_at: '2024-02-11 09:00:00' }
];

// 模拟积分榜
const ranking = [
  { _id: 'user_001', nickname: '马拉松爱好者', avatar: '/images/default-avatar.png', points: 890 },
  { _id: 'user_002', nickname: '晨跑达人 - 小红', avatar: '/images/default-avatar.png', points: 580 },
  { _id: 'mock_user_001', nickname: '测试用户', avatar: '/images/default-avatar.png', points: 500 },
  { _id: 'user_003', nickname: '跑步爱好者 - 小明', avatar: '/images/default-avatar.png', points: 320 },
  { _id: 'user_004', nickname: '夜跑小王子', avatar: '/images/default-avatar.png', points: 240 }
];

// 模拟成员列表
const members = [
  { _id: 'leader_001', nickname: '团长 - 张三', avatar: '/images/default-avatar.png', phone: '13800138000', role: 'leader', status: 'approved', created_at: '2024-01-01' },
  { _id: 'admin_001', nickname: '管理员 - 李四', avatar: '/images/default-avatar.png', phone: '13800138001', role: 'admin', status: 'approved', created_at: '2024-01-02' },
  { _id: 'member_001', nickname: '跑步爱好者 - 小明', avatar: '/images/default-avatar.png', phone: '13800138003', role: 'member', status: 'approved', created_at: '2024-01-05' },
  { _id: 'member_002', nickname: '晨跑达人 - 小红', avatar: '/images/default-avatar.png', phone: '13800138004', role: 'member', status: 'approved', created_at: '2024-01-06' },
  { _id: 'pending_001', nickname: '新用户 - 小赵', avatar: '/images/default-avatar.png', phone: '13800138007', role: 'member', status: 'pending', created_at: '2024-03-10' }
];

module.exports = {
  currentUser,
  users,
  setCurrentRole: function(role) {
    const mockData = require('./mock-data');
    // 注意：由于模块缓存，实际使用时需要重新 require
    return users[role] || users.member;
  },
  activities,
  products,
  pointLogs,
  ranking,
  members
};