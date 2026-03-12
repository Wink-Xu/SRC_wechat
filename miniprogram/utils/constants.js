// utils/constants.js - 常量定义

// 用户角色
const ROLES = {
  GUEST: 'guest',     // 游客（已登录但未申请入团）
  PENDING: 'pending', // 待审批
  MEMBER: 'member',   // 团员
  ADMIN: 'admin',     // 管理员
  LEADER: 'leader'    // 团长
};

// 用户状态
const USER_STATUS = {
  GUEST: 'guest',     // 游客（已登录但未申请入团）
  PENDING: 'pending', // 待审批
  APPROVED: 'approved', // 已批准
  REJECTED: 'rejected'  // 已拒绝
};

// 活动状态
const ACTIVITY_STATUS = {
  DRAFT: 'draft',         // 草稿
  PUBLISHED: 'published', // 已发布
  ONGOING: 'ongoing',     // 进行中
  ENDED: 'ended',         // 已结束
  CANCELLED: 'cancelled'  // 已取消
};

// 活动状态文本
const ACTIVITY_STATUS_TEXT = {
  draft: '草稿',
  published: '报名中',
  ongoing: '进行中',
  ended: '已结束',
  cancelled: '已取消'
};

// 活动状态样式
const ACTIVITY_STATUS_CLASS = {
  draft: 'tag-warning',
  published: 'tag-primary',
  ongoing: 'tag-success',
  ended: 'tag-secondary',
  cancelled: 'tag-error'
};

// 报名状态
const REGISTRATION_STATUS = {
  REGISTERED: 'registered',  // 已报名
  CHECKED_IN: 'checked_in',  // 已签到
  CANCELLED: 'cancelled'     // 已取消
};

// 报名状态文本
const REGISTRATION_STATUS_TEXT = {
  registered: '已报名',
  checked_in: '已签到',
  cancelled: '已取消'
};

// 商品状态
const PRODUCT_STATUS = {
  AVAILABLE: 'available',    // 可购买
  UNAVAILABLE: 'unavailable' // 不可购买
};

// 订单状态
const ORDER_STATUS = {
  PENDING: 'pending',     // 待支付
  PAID: 'paid',           // 已支付
  SHIPPED: 'shipped',     // 已发货
  COMPLETED: 'completed', // 已完成
  CANCELLED: 'cancelled'  // 已取消
};

// 订单状态文本
const ORDER_STATUS_TEXT = {
  pending: '待支付',
  paid: '已支付',
  shipped: '已发货',
  completed: '已完成',
  cancelled: '已取消'
};

// 积分类型
const POINT_TYPE = {
  ACTIVITY: 'activity',   // 活动签到
  EXCHANGE: 'exchange',  // 兑换商品
  ADMIN: 'admin'         // 管理员调整
};

// 积分类型文本
const POINT_TYPE_TEXT = {
  activity: '活动签到',
  exchange: '兑换商品',
  admin: '管理员调整'
};

// 支付方式
const PAY_METHOD = {
  POINTS: 'points',  // 积分支付
  WECHAT: 'wechat'   // 微信支付
};

module.exports = {
  ROLES,
  USER_STATUS,
  ACTIVITY_STATUS,
  ACTIVITY_STATUS_TEXT,
  ACTIVITY_STATUS_CLASS,
  REGISTRATION_STATUS,
  REGISTRATION_STATUS_TEXT,
  PRODUCT_STATUS,
  ORDER_STATUS,
  ORDER_STATUS_TEXT,
  POINT_TYPE,
  POINT_TYPE_TEXT,
  PAY_METHOD
};