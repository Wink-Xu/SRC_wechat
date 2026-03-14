# 扫码签到功能设计文档

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现扫码签到功能，替换原有的审批流程，简化活动结束和积分发放流程。

**Architecture:**
- 管理员在活动详情页可查看签到二维码
- 团员使用小程序扫码功能扫描二维码进行签到
- 签到数据存储在 registration 记录中（添加 check_in_status 字段）
- 活动结束后，系统自动给已签到的团员发放积分
- 移除原有的 activity-approval 审批页面

**Tech Stack:**
- 微信小程序原生开发 (WXML, WXSS, JavaScript)
- 微信云开发 (云函数 + 云数据库)
- 当前使用 Mock 模式 (USE_MOCK = true)
- 微信原生 API: wx.scanCode

---

## 一、数据库结构变更

### 1.1 registrations 表新增字段

```javascript
// registrations 表
{
  _id: 'reg_xxx',
  activity_id: 'activity_001',
  user_id: 'user_001',
  status: 'registered',      // 报名状态：registered, cancelled
  check_in_status: 'pending', // 签到状态：pending, checked_in
  check_in_time: null,        // 签到时间 ISO 字符串
  points_awarded: false,      // 是否已发放积分
  created_at: '2024-03-17T08:00:00.000Z'
}
```

### 1.2 activities 表新增字段

```javascript
// activities 表新增
{
  // ... 现有字段
  check_in_qr_code: 'data:image/png;base64,...', // 二维码图片（可选，动态生成更好）
  check_in_enabled: true  // 是否启用签到
}
```

## 二、API 接口变更

### 2.1 activityApi 新增方法

```javascript
const activityApi = {
  // ... 现有方法
  checkIn: (data) => callFunction('activity', 'checkIn', data),           // 用户签到
  getCheckInQrCode: (data) => callFunction('activity', 'getCheckInQrCode', data), // 获取签到码
  finishActivityWithCheckIn: (data) => callFunction('activity', 'finishActivityWithCheckIn', data) // 结束活动并发放积分
};
```

### 2.2 Mock 数据支持

在 `handleActivityMock` 中添加：
- `case 'checkIn'`: 处理签到逻辑，更新 registrations 状态
- `case 'getCheckInQrCode'`: 返回模拟二维码数据
- `case 'finishActivityWithCheckIn'`: 结束活动并发放积分

## 三、文件修改清单

### 3.1 需要创建的文件

| 文件 | 说明 |
|------|------|
| `miniprogram/pages/activity-checkin/activity-checkin.js` | 扫码签到页面逻辑 |
| `miniprogram/pages/activity-checkin/activity-checkin.wxml` | 扫码签到页面结构 |
| `miniprogram/pages/activity-checkin/activity-checkin.wxss` | 扫码签到页面样式 |
| `miniprogram/pages/activity-checkin/activity-checkin.json` | 扫码签到页面配置 |

### 3.2 需要修改的文件

| 文件 | 修改内容 |
|------|----------|
| `miniprogram/utils/mock-data.js` | 添加签到状态字段到模拟数据 |
| `miniprogram/utils/request.js` | 添加 checkIn、getCheckInQrCode API |
| `miniprogram/pages/activity-detail/activity-detail.js` | 添加显示签到码（管理员）、处理签到结果 |
| `miniprogram/pages/activity-detail/activity-detail.wxml` | 添加签到码显示区域、签到按钮 |
| `miniprogram/pages/activity-detail/activity-detail.wxss` | 签到码样式 |
| `miniprogram/pages/admin-activities/admin-activities.js` | 简化 finishActivity 方法，直接结束活动并发放积分 |
| `miniprogram/pages/admin-activities/admin-activities.wxml` | 移除跳转到审批页的逻辑 |

### 3.3 需要删除/归档的文件

| 文件 | 处理方式 |
|------|----------|
| `miniprogram/pages/activity-approval/` | 删除整个目录 |

## 四、功能流程

### 4.1 管理员查看签到码流程

```
管理员 → 活动详情页 → 点击"查看签到码" → 弹窗显示二维码
     → 团员扫码 → 完成签到 → 管理员看到签到人数更新
```

### 4.2 团员签到流程

```
团员 → 活动详情页 → 点击"签到"按钮
     → 调用 wx.scanCode 扫码
     → 解析二维码中的 activity_id
     → 调用 checkIn API
     → 显示签到成功
```

### 4.3 结束活动流程（简化版）

```
管理员 → 活动管理页 → 点击"结束活动"
     → 确认结束 → 系统自动统计已签到人员
     → 自动发放积分 → 活动状态变更为 ended
```

## 五、UI 设计方案

### 5.1 活动详情页（ongoing 状态）

在底部操作区添加：
- 已签到用户：显示"已签到"标识（不可重复签到）
- 未签到用户：显示"签到"按钮
- 管理员：额外显示"查看签到码"按钮

### 5.2 签到码弹窗

```
┌─────────────────────────────────┐
│     活动签到码                   │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  │      [二维码图片]          │  │
│  │                           │  │
│  └───────────────────────────┘  │
│                                 │
│  请团员使用小程序扫码签到        │
│                                 │
│  已签到：15/30 人               │
│                                 │
│        [关闭]                    │
└─────────────────────────────────┘
```

### 5.3 配色方案

保持现有紫色主题 (#9C27B0)：
- 签到码边框：purple gradient
- 签到成功标识：green (#4CAF50)
- 签到按钮：purple primary

## 六、测试要点

1. **管理员权限测试**
   - 只有管理员/团长能看到签到码
   - 只有管理员能结束活动

2. **签到流程测试**
   - 未报名用户不能签到
   - 已签到用户不能重复签到
   - 扫码后需要确认

3. **积分发放测试**
   - 结束活动后，只有已签到用户获得积分
   - 积分记录正确写入 point_logs

4. **边界情况**
   - 活动已结束，不能再签到
   - 活动名额已满，仍能签到（因为已报名）

## 七、分阶段任务列表

### Phase 1: 数据层准备
- [ ] Task 1: 更新 mock-data.js，添加签到状态字段
- [ ] Task 2: 在 request.js 中添加 checkIn、getCheckInQrCode API

### Phase 2: 管理员功能
- [ ] Task 3: 创建活动详情页签到码显示功能
- [ ] Task 4: 实现 getCheckInQrCode Mock API

### Phase 3: 用户签到功能
- [ ] Task 5: 创建活动详情页签到按钮
- [ ] Task 6: 实现 checkIn Mock API
- [ ] Task 7: 实现扫码签到页面（activity-checkin）

### Phase 4: 结束活动流程简化
- [ ] Task 8: 修改 admin-activities.js 的 finishActivity 方法
- [ ] Task 9: 实现 finishActivityWithCheckIn Mock API
- [ ] Task 10: 自动发放积分逻辑

### Phase 5: 清理工作
- [ ] Task 11: 删除 activity-approval 页面目录
- [ ] Task 12: 更新 participants 页面显示签到状态

### Phase 6: 测试与优化
- [ ] Task 13: 完整流程测试
- [ ] Task 14: UI 细节优化

---

**Git 提交策略:**
- 每个 Task 完成后单独 commit
- Commit message 格式：`feat: add QR code check-in feature - Task N`
- 全部完成后创建一个总的 merge commit

**验收标准:**
1. 管理员能在活动详情页查看签到二维码
2. 团员能扫码完成签到
3. 签到状态实时更新显示
4. 管理员结束活动后，已签到团员自动获得积分
5. activity-approval 页面已移除
