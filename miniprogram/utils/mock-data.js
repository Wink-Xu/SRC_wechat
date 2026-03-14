// utils/mock-data.js - 本地模拟数据（无需云开发）

// ============================================
// 角色切换配置
// 修改 CURRENT_ROLE 来切换登录用户身份：
// 'guest'   - 游客（已登录但未申请入团）
// 'member' - 普通团员
// 'leader' - 团长
// 'admin'  - 管理员
// 'pending' - 待审批用户
// ============================================
const CURRENT_ROLE = 'admin';

// 模拟用户数据
const users = {
  // 游客（已登录但未申请入团）
  guest: {
    _id: 'mock_user_001',
    openid: 'mock_openid',
    nickname: '游客用户',
    avatar: '/images/default-avatar.png',
    phone: '',
    role: 'member',
    status: 'guest',  // 游客状态
    points: 0
  },
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
  },
  // 待审批用户
  pending: {
    _id: 'mock_user_pending',
    openid: 'mock_pending_openid',
    nickname: '待审批用户',
    avatar: '/images/default-avatar.png',
    phone: '13800138000',
    role: 'member',
    status: 'pending',
    points: 0
  }
};

// 当前登录用户（根据角色切换）
const currentUser = users[CURRENT_ROLE] || users.member;

// 模拟活动列表
const activities = [
  // 正在报名的活动（1 个）- 改为 ongoing 状态用于测试签到功能
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
    status: 'ongoing', // 改为 ongoing 状态
    registered_count: 15,
    check_in_count: 8, // 已签到人数
    check_in_enabled: true, // 启用签到
    created_by: 'leader_001'
  },
  // 往期活动（5 个）
  {
    _id: 'activity_past_001',
    title: '新春第一跑 - 圆明园',
    description: '新年首次活动，圆明园冰雪主题跑，感受历史与自然的融合。',
    location: '圆明园南门',
    run_type: 'road',
    dress_code: '统一穿红色队服',
    start_time: '2024-02-18 09:00:00',
    end_time: '2024-02-18 11:00:00',
    registration_deadline: '2024-02-17',
    quota: 40,
    points: 25,
    status: 'ended',
    registered_count: 38,
    created_by: 'leader_001',
    cover_image: '/images/cover-1.svg',
    photos: [
      '/images/activity-1-1.svg', '/images/activity-1-2.svg', '/images/activity-1-3.svg',
      '/images/activity-1-4.svg', '/images/activity-1-5.svg', '/images/activity-1-6.svg',
      '/images/activity-1-7.svg', '/images/activity-1-8.svg', '/images/activity-1-9.svg',
      '/images/activity-1-10.svg', '/images/activity-1-11.svg', '/images/activity-1-12.svg',
      '/images/activity-1-13.svg', '/images/activity-1-14.svg', '/images/activity-1-15.svg',
      '/images/activity-1-16.svg', '/images/activity-1-17.svg', '/images/activity-1-18.svg',
      '/images/activity-1-19.svg', '/images/activity-1-20.svg'
    ]
  },
  {
    _id: 'activity_past_002',
    title: '元宵夜跑 - 前门大街',
    description: '元宵节特别活动，夜跑前门大街，欣赏花灯夜景。',
    location: '前门大街',
    run_type: 'road',
    dress_code: '穿着带反光条装备',
    start_time: '2024-02-24 19:00:00',
    end_time: '2024-02-24 20:30:00',
    registration_deadline: '2024-02-24',
    quota: 25,
    points: 20,
    status: 'ended',
    registered_count: 22,
    created_by: 'admin_001',
    cover_image: '/images/cover-2.svg',
    photos: [
      '/images/activity-2-1.svg', '/images/activity-2-2.svg', '/images/activity-2-3.svg',
      '/images/activity-2-4.svg', '/images/activity-2-5.svg', '/images/activity-2-6.svg',
      '/images/activity-2-7.svg', '/images/activity-2-8.svg', '/images/activity-2-9.svg',
      '/images/activity-2-10.svg', '/images/activity-2-11.svg', '/images/activity-2-12.svg',
      '/images/activity-2-13.svg', '/images/activity-2-14.svg', '/images/activity-2-15.svg',
      '/images/activity-2-16.svg', '/images/activity-2-17.svg', '/images/activity-2-18.svg',
      '/images/activity-2-19.svg', '/images/activity-2-20.svg'
    ]
  },
  {
    _id: 'activity_past_003',
    title: '春日越野 - 慕田峪长城',
    description: '春季越野跑，慕田峪长城脚下，挑战山地路线。',
    location: '慕田峪长城景区',
    run_type: 'trail',
    dress_code: '穿越野跑鞋',
    start_time: '2024-03-02 08:00:00',
    end_time: '2024-03-02 12:00:00',
    registration_deadline: '2024-03-01',
    quota: 20,
    points: 40,
    status: 'ended',
    registered_count: 20,
    created_by: 'leader_001',
    cover_image: '/images/cover-3.svg',
    photos: [
      '/images/activity-3-1.svg', '/images/activity-3-2.svg', '/images/activity-3-3.svg',
      '/images/activity-3-4.svg', '/images/activity-3-5.svg', '/images/activity-3-6.svg',
      '/images/activity-3-7.svg', '/images/activity-3-8.svg', '/images/activity-3-9.svg',
      '/images/activity-3-10.svg', '/images/activity-3-11.svg', '/images/activity-3-12.svg',
      '/images/activity-3-13.svg', '/images/activity-3-14.svg', '/images/activity-3-15.svg',
      '/images/activity-3-16.svg', '/images/activity-3-17.svg', '/images/activity-3-18.svg',
      '/images/activity-3-19.svg', '/images/activity-3-20.svg'
    ]
  },
  {
    _id: 'activity_past_004',
    title: '女子专属跑 - 三八节特别活动',
    description: '三八妇女节女子专属跑步活动，展现女性力量。',
    location: '朝阳公园',
    run_type: 'road',
    dress_code: '粉色系运动装',
    start_time: '2024-03-08 10:00:00',
    end_time: '2024-03-08 11:30:00',
    registration_deadline: '2024-03-07',
    quota: 30,
    points: 25,
    status: 'ended',
    registered_count: 28,
    created_by: 'admin_001',
    cover_image: '/images/cover-4.svg',
    photos: [
      '/images/activity-4-1.svg', '/images/activity-4-2.svg', '/images/activity-4-3.svg',
      '/images/activity-4-4.svg', '/images/activity-4-5.svg', '/images/activity-4-6.svg',
      '/images/activity-4-7.svg', '/images/activity-4-8.svg', '/images/activity-4-9.svg',
      '/images/activity-4-10.svg', '/images/activity-4-11.svg', '/images/activity-4-12.svg',
      '/images/activity-4-13.svg', '/images/activity-4-14.svg', '/images/activity-4-15.svg',
      '/images/activity-4-16.svg', '/images/activity-4-17.svg', '/images/activity-4-18.svg',
      '/images/activity-4-19.svg', '/images/activity-4-20.svg'
    ]
  },
  {
    _id: 'activity_past_005',
    title: '春季训练营 - 间歇跑训练',
    description: '春季间歇跑训练，提升配速能力，专业教练指导。',
    location: '国家体育场鸟巢',
    run_type: 'road',
    dress_code: '专业跑鞋',
    start_time: '2024-03-10 07:00:00',
    end_time: '2024-03-10 09:00:00',
    registration_deadline: '2024-03-09',
    quota: 15,
    points: 30,
    status: 'ended',
    registered_count: 15,
    created_by: 'admin_002',
    cover_image: '/images/cover-5.svg',
    photos: [
      '/images/activity-5-1.svg', '/images/activity-5-2.svg', '/images/activity-5-3.svg',
      '/images/activity-5-4.svg', '/images/activity-5-5.svg', '/images/activity-5-6.svg',
      '/images/activity-5-7.svg', '/images/activity-5-8.svg', '/images/activity-5-9.svg',
      '/images/activity-5-10.svg', '/images/activity-5-11.svg', '/images/activity-5-12.svg',
      '/images/activity-5-13.svg', '/images/activity-5-14.svg', '/images/activity-5-15.svg',
      '/images/activity-5-16.svg', '/images/activity-5-17.svg', '/images/activity-5-18.svg',
      '/images/activity-5-19.svg', '/images/activity-5-20.svg'
    ]
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