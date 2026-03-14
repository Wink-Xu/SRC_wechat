# 扫码签到功能实现计划

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

## Phase 1: 数据层准备

### Task 1: 更新 mock-data.js，添加签到状态字段

**Files:**
- Modify: `miniprogram/utils/mock-data.js`

- [ ] **Step 1: 在 registrations 对象中添加签到状态字段**

在 `handleActivityMock` 函数上方添加全局 registrations 对象（已存在），确保每个报名记录包含：
```javascript
{
  _id: `reg_${Date.now()}`,
  activity_id: activityId,
  user_id: userId,
  status: 'registered',
  check_in_status: 'pending', // 新增：签到状态 pending/checked_in
  check_in_time: null,        // 新增：签到时间
  points_awarded: false,      // 新增：是否已发放积分
  created_at: new Date().toISOString()
}
```

- [ ] **Step 2: 更新 mockData.activities 中 ongoing 活动**

将 `activity_001` 的状态改为 `ongoing`（原来是 published），并添加：
```javascript
check_in_enabled: true,
check_in_count: 0  // 已签到人数
```

- [ ] **Step 3: 更新 members 列表，添加 isRegistered 和 check_in_status 字段**

为每个 member 添加模拟的报名和签到状态，用于活动详情页的参与者列表显示。

- [ ] **Step 4: Commit**

```bash
git add miniprogram/utils/mock-data.js
git commit -m "feat: add check-in status fields to mock data"
```

---

### Task 2: 在 request.js 中添加签到相关 API

**Files:**
- Modify: `miniprogram/utils/request.js`

- [ ] **Step 1: 在 activityApi 对象中添加新方法**

在 `activityApi` 对象中添加：
```javascript
const activityApi = {
  // ... 现有方法
  getCheckInQrCode: (data) => callFunction('activity', 'getCheckInQrCode', data, { showLoad: false }),
  checkIn: (data) => callFunction('activity', 'checkIn', data),
  finishActivityWithCheckIn: (data) => callFunction('activity', 'finishActivityWithCheckIn', data)
};
```

- [ ] **Step 2: 在 handleActivityMock 中添加 case 'getCheckInQrCode'**

```javascript
case 'getCheckInQrCode': {
  // 生成模拟二维码数据（实际项目中可使用 qrcode 库）
  const qrData = {
    activity_id: data.id,
    qr_code: `data:image/png;base64,simulated_qr_${data.id}`,
    check_in_count: 0
  };
  return Promise.resolve({ code: 0, data: qrData });
}
```

- [ ] **Step 3: 在 handleActivityMock 中添加 case 'checkIn'**

```javascript
case 'checkIn': {
  const userId = mockData.currentUser._id;
  const activityId = data.activityId;

  // 检查是否已报名
  const existingReg = isRegistered(activityId, userId);
  if (!existingReg) {
    return Promise.resolve({ code: 1, message: '请先报名参加活动', data: null });
  }

  // 检查是否已签到
  if (existingReg.check_in_status === 'checked_in') {
    return Promise.resolve({ code: 1, message: '您已签到，无需重复操作', data: null });
  }

  // 更新签到状态
  existingReg.check_in_status = 'checked_in';
  existingReg.check_in_time = new Date().toISOString();

  // 更新活动签到人数
  const activity = mockData.activities.find(a => a._id === activityId);
  if (activity) {
    activity.check_in_count = (activity.check_in_count || 0) + 1;
  }

  console.log('[Mock] 用户签到:', { activityId, userId });
  return Promise.resolve({ code: 0, data: { success: true } });
}
```

- [ ] **Step 4: 在 handleActivityMock 中添加 case 'finishActivityWithCheckIn'**

```javascript
case 'finishActivityWithCheckIn': {
  const activity = mockData.activities.find(a => a._id === data.id);
  if (!activity) {
    return Promise.resolve({ code: 1, message: '活动不存在', data: null });
  }

  // 更新活动状态
  activity.status = 'ended';

  // 给所有已签到的用户发放积分
  const pointsToAward = activity.points || 20;
  let awardedCount = 0;

  // 遍历所有报名记录
  Object.values(registrations).forEach(reg => {
    if (reg.activity_id === data.id && reg.check_in_status === 'checked_in' && !reg.points_awarded) {
      reg.points_awarded = true;
      // 模拟给用户添加积分
      if (mockData.currentUser._id === reg.user_id) {
        mockData.currentUser.points += pointsToAward;
      }
      awardedCount++;
    }
  });

  console.log('[Mock] 结束活动并发放积分:', { activityId: data.id, awardedCount, points: pointsToAward });
  return Promise.resolve({
    code: 0,
    data: {
      success: true,
      awarded_count: awardedCount,
      points_per_person: pointsToAward
    }
  });
}
```

- [ ] **Step 5: Commit**

```bash
git add miniprogram/utils/request.js
git commit -m "feat: add check-in API methods to activityApi"
```

---

## Phase 2: 管理员功能 - 签到码显示

### Task 3: 创建活动详情页签到码显示功能

**Files:**
- Modify: `miniprogram/pages/activity-detail/activity-detail.js`
- Modify: `miniprogram/pages/activity-detail/activity-detail.wxml`
- Modify: `miniprogram/pages/activity-detail/activity-detail.wxss`

- [ ] **Step 1: 在 activity-detail.js 的 data 中添加新字段**

```javascript
data: {
  // ... 现有字段
  showCheckInQr: false,      // 是否显示签到码弹窗
  checkInQrCode: '',         // 签到码图片数据
  checkInCount: 0,           // 已签到人数
  isAdminOrLeader: false     // 是否管理员或团长
}
```

- [ ] **Step 2: 在 loadActivity 方法中添加权限判断**

在 `loadActivity` 方法的 `setData` 中添加：
```javascript
const app = getApp();
const isAdminOrLeader = app.globalData.userInfo &&
  (app.globalData.userInfo.role === 'admin' || app.globalData.userInfo.role === 'leader');

this.setData({
  // ... 现有 setData 内容
  isAdminOrLeader,
  checkInCount: activity.check_in_count || 0
});
```

- [ ] **Step 3: 添加显示签到码弹窗的方法**

```javascript
// 显示签到码
showCheckInQrCode: async function () {
  try {
    const result = await activityApi.getCheckInQrCode({ id: this.data.id });
    this.setData({
      checkInQrCode: result.qr_code,
      checkInCount: result.check_in_count || 0,
      showCheckInQr: true
    });
  } catch (error) {
    console.error('获取签到码失败', error);
  }
},

// 关闭签到码弹窗
closeCheckInQrCode: function () {
  this.setData({
    showCheckInQr: false
  });
},

// 刷新签到人数
refreshCheckInCount: async function () {
  try {
    const result = await activityApi.getCheckInQrCode({ id: this.data.id });
    this.setData({
      checkInCount: result.check_in_count || 0
    });
  } catch (error) {
    console.error('刷新签到人数失败', error);
  }
}
```

- [ ] **Step 4: 在 activity-detail.wxml 中添加签到按钮（管理员可见）**

在 `<view class="footer-actions">` 区域内，正在报名/进行中的活动块中，添加：
```xml
<!-- 管理员查看签到码按钮 -->
<view wx:if="{{isAdminOrLeader && activity.status === 'ongoing'}}" class="admin-actions">
  <button class="btn btn-secondary btn-small" bindtap="showCheckInQrCode">
    查看签到码
  </button>
  <text class="checkin-count">已签到：{{checkInCount}}人</text>
</view>
```

- [ ] **Step 5: 在 activity-detail.wxml 中添加用户签到按钮**

在 `footer-actions` 区域添加用户签到按钮：
```xml
<!-- 用户签到按钮 -->
<block wx:elif="{{isRegistered && activity.status === 'ongoing' && registration.check_in_status !== 'checked_in'}}">
  <button class="btn btn-primary btn-full" bindtap="handleCheckIn">
    扫码签到
  </button>
</block>
```

- [ ] **Step 6: 在 activity-detail.wxml 中添加签到码弹窗**

在页面底部添加弹窗组件：
```xml
<!-- 签到码弹窗 -->
<view class="modal-mask" wx:if="{{showCheckInQr}}" bindtap="closeCheckInQrCode">
  <view class="modal-content" catchtap="noop">
    <view class="modal-header">
      <text class="modal-title">活动签到码</text>
      <text class="modal-close" bindtap="closeCheckInQrCode">×</text>
    </view>
    <view class="modal-body">
      <image class="qr-code-img" src="{{checkInQrCode}}" mode="aspectFit"></image>
      <text class="qr-hint">请团员使用小程序扫码签到</text>
      <view class="qr-stats">
        <text>已签到：{{checkInCount}}人</text>
      </view>
    </view>
  </view>
</view>
```

- [ ] **Step 7: 在 activity-detail.wxss 中添加弹窗样式**

```css
/* 签到码弹窗样式 */
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #fff;
  border-radius: 24rpx;
  width: 80%;
  max-width: 600rpx;
  padding: 0;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.modal-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.modal-close {
  font-size: 40rpx;
  color: #999;
  line-height: 1;
}

.modal-body {
  padding: 40rpx 30rpx;
  text-align: center;
}

.qr-code-img {
  width: 400rpx;
  height: 400rpx;
  margin-bottom: 24rpx;
}

.qr-hint {
  display: block;
  font-size: 26rpx;
  color: #666;
  margin-bottom: 16rpx;
}

.qr-stats {
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #f0f0f0;
}

.qr-stats text {
  font-size: 28rpx;
  color: #9C27B0;
  font-weight: 600;
}

/* 管理员操作区 */
.admin-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.checkin-count {
  font-size: 24rpx;
  color: #666;
}

.btn-small {
  height: 64rpx;
  padding: 0 32rpx;
  font-size: 28rpx;
}
```

- [ ] **Step 8: Commit**

```bash
git add miniprogram/pages/activity-detail/activity-detail.*
git commit -m "feat: add QR code check-in display for admins"
```

---

## Phase 3: 用户签到功能

### Task 4: 实现用户扫码签到功能

**Files:**
- Modify: `miniprogram/pages/activity-detail/activity-detail.js`

- [ ] **Step 1: 添加 handleCheckIn 方法**

```javascript
// 扫码签到
handleCheckIn: function () {
  const that = this;

  wx.scanCode({
    success: function (res) {
      console.log('扫码结果:', res);

      // 解析二维码内容，期望格式：{ type: 'checkin', activity_id: 'xxx' }
      let qrData;
      try {
        qrData = JSON.parse(res.result);
      } catch (e) {
        // 兼容纯文本二维码（只有 activity_id）
        qrData = { type: 'checkin', activity_id: res.result };
      }

      if (qrData.type !== 'checkin' || !qrData.activity_id) {
        wx.showToast({
          title: '无效的签到码',
          icon: 'none'
        });
        return;
      }

      if (qrData.activity_id !== that.data.id) {
        wx.showToast({
          title: '此码不属于当前活动',
          icon: 'none'
        });
        return;
      }

      // 确认签到
      wx.showModal({
        title: '确认签到',
        content: `确认参加"${that.data.activity.title}"？`,
        success: function (modalRes) {
          if (modalRes.confirm) {
            that.confirmCheckIn(qrData.activity_id);
          }
        }
      });
    },
    fail: function (err) {
      console.error('扫码失败', err);
      if (err.errMsg.includes('cancel')) {
        // 用户取消扫码，不做提示
      } else {
        wx.showToast({
          title: '扫码失败，请重试',
          icon: 'none'
        });
      }
    }
  });
},

// 确认签到
confirmCheckIn: async function (activityId) {
  try {
    await activityApi.checkIn({ activityId });
    wx.showToast({
      title: '签到成功',
      icon: 'success'
    });
    // 刷新活动详情，更新签到状态
    this.loadActivity();
  } catch (error) {
    console.error('签到失败', error);
    wx.showToast({
      title: error?.message || '签到失败，请重试',
      icon: 'none'
    });
  }
}
```

- [ ] **Step 2: 更新 participants 列表显示签到状态**

在 `loadActivity` 方法中，更新 participants 的映射逻辑，确保显示签到状态：
```javascript
const participants = (result.participants || []).map(p => ({
  ...p,
  status: p.status || 'registered' // 确保有 status 字段
}));

this.setData({
  // ...
  participants
});
```

- [ ] **Step 3: Commit**

```bash
git add miniprogram/pages/activity-detail/activity-detail.js
git commit -m "feat: add user scan-to-checkin functionality"
```

---

## Phase 4: 结束活动流程简化

### Task 5: 修改 admin-activities.js 的 finishActivity 方法

**Files:**
- Modify: `miniprogram/pages/admin-activities/admin-activities.js`

- [ ] **Step 1: 简化 finishActivity 方法，移除跳转到审批页的逻辑**

将原来的 `finishActivity` 方法替换为：
```javascript
// 结束活动（简化版）
finishActivity: async function (e) {
  const { id } = e.currentTarget.dataset;

  const confirm = await showConfirm('结束活动', '活动结束后，系统将自动给已签到的团员发放积分。确认结束？');
  if (!confirm) return;

  try {
    const result = await activityApi.finishActivityWithCheckIn({ id });
    showSuccess(`活动已结束，共发放 ${result.awarded_count} 人 ${result.points_per_person} 积分`);
    this.refreshActivities();
  } catch (error) {
    console.error('结束活动失败', error);
    wx.showToast({
      title: '结束活动失败',
      icon: 'none'
    });
  }
}
```

- [ ] **Step 2: 更新 wxml 中的按钮文本**

Modify: `miniprogram/pages/admin-activities/admin-activities.wxml`

将按钮文本从"结束活动"改为"结束并发放积分"：
```xml
<button
  wx:if="{{item.status === 'ongoing'}}"
  class="btn btn-warning btn-small"
  data-id="{{item._id}}"
  bindtap="finishActivity"
>结束并发放积分</button>
```

- [ ] **Step 3: Commit**

```bash
git add miniprogram/pages/admin-activities/admin-activities.*
git commit -m "feat: simplify finish activity flow with auto points distribution"
```

---

## Phase 5: 清理工作

### Task 6: 删除 activity-approval 页面

**Files:**
- Delete: `miniprogram/pages/activity-approval/`

- [ ] **Step 1: 删除整个 activity-approval 目录**

```bash
rm -rf miniprogram/pages/activity-approval
```

- [ ] **Step 2: 检查是否有其他地方引用了 activity-approval 页面**

```bash
grep -r "activity-approval" miniprogram/
```

如果有引用，需要移除或修改。

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove deprecated activity-approval page"
```

---

### Task 7: 更新 participants 页面显示签到状态

**Files:**
- Modify: `miniprogram/pages/activity-participants/activity-participants.wxml`
- Modify: `miniprogram/pages/activity-participants/activity-participants.wxss`

- [ ] **Step 1: 在 participants 列表中显示签到状态**

修改参与者列表项，添加签到标识：
```xml
<view class="participant-item">
  <text class="participant-index">{{index + 1}}</text>
  <image class="participant-avatar" src="{{item.avatar}}"/>
  <text class="participant-name">{{item.nickname}}</text>
  <text class="status-badge {{item.status === 'checked_in' ? 'checked-in' : 'pending'}}">
    {{item.status === 'checked_in' ? '已签到' : '未签到'}}
  </text>
</view>
```

- [ ] **Step 2: 添加签到状态样式**

在 wxss 中添加：
```css
.status-badge {
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
  margin-left: auto;
}

.status-badge.checked-in {
  background: #E8F5E9;
  color: #2E7D32;
}

.status-badge.pending {
  background: #FFF3E0;
  color: #E65100;
}
```

- [ ] **Step 3: Commit**

```bash
git add miniprogram/pages/activity-participants/activity-participants.*
git commit -m "feat: show check-in status in participants list"
```

---

## Phase 6: 测试与优化

### Task 8: 完整流程测试

**Files:** 无需修改

- [ ] **Step 1: 测试管理员查看签到码**
  1. 切换到管理员账号（CURRENT_ROLE = 'admin'）
  2. 进入活动详情页（ongoing 状态）
  3. 点击"查看签到码"
  4. 验证弹窗显示

- [ ] **Step 2: 测试用户签到流程**
  1. 切换到团员账号（CURRENT_ROLE = 'member'）
  2. 进入活动详情页
  3. 点击"扫码签到"
  4. 模拟扫码（可手动修改 test 代码）
  5. 验证签到成功提示

- [ ] **Step 3: 测试结束活动流程**
  1. 切换到管理员账号
  2. 进入管理后台
  3. 点击"结束并发放积分"
  4. 验证活动状态变更和积分发放

- [ ] **Step 4: 验证 participants 列表**
  1. 进入参与者列表页
  2. 验证已签到/未签到状态正确显示

### Task 9: UI 细节优化

- [ ] **Step 1: 检查弹窗在不同屏幕尺寸的适配**
- [ ] **Step 2: 优化签到码弹窗的关闭体验（点击遮罩关闭）**
- [ ] **Step 3: 添加签到成功后的动画效果（可选）**
- [ ] **Step 4: 统一所有按钮的样式和间距**

---

## 验收标准

1. ✅ 管理员能在活动详情页查看签到二维码
2. ✅ 团员能扫码完成签到
3. ✅ 签到状态实时更新显示
4. ✅ 管理员结束活动后，已签到团员自动获得积分
5. ✅ activity-approval 页面已移除
6. ✅ participants 页面显示签到状态

---

## 后续优化建议（可选）

1. **生成真实二维码**: 使用 `qrcode` 库生成真实的二维码图片
2. **现场网络问题**: 考虑离线签到场景，支持先扫码后同步
3. **签到统计**: 在管理后台增加签到率统计图表
4. **签到提醒**: 活动开始前发送签到提醒通知
