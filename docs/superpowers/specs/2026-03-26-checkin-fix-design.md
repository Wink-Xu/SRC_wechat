# 扫码签到功能修复设计

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

## 背景

扫码签到功能已有基础实现，但存在几个问题导致功能无法闭环：
1. 签到码无法显示（云函数返回 fileID，前端无法直接显示）
2. 签到条件过严（要求活动状态为 `ongoing`，但发布后状态是 `published`）
3. 签到人数不实时更新

## 设计决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 签到方式 | 只能扫码签到 | 保持现有设计，管理员展示签到码，团员扫码 |
| 签到码显示 | 云函数返回 URL | 前端无需额外处理，直接显示 |
| 签到人数更新 | 定时刷新 | 每 5 秒自动刷新，管理员实时掌握签到情况 |
| 签到时间窗口 | published 或 ongoing 都可签到 | 放宽条件，活动发布后即可签到 |

## 技术方案

### 1. 云函数返回 URL（修复签到码显示）

**文件：** `cloudfunctions/activity/index.js`

**修改 `handleGetCheckInQrCode` 函数：**

```javascript
// 当前代码：返回 fileID
return {
  code: 0,
  data: {
    qr_code: uploadResult.fileID,  // 这是云存储 fileID，前端无法直接显示
    // ...
  }
};

// 修改为：调用 getTempFileURL 转换为临时 URL
const tempUrlResult = await cloud.getTempFileURL({
  fileList: [uploadResult.fileID]
});

return {
  code: 0,
  data: {
    qr_code: tempUrlResult.fileList[0].tempFileURL,  // 可访问的临时 URL
    // ...
  }
};
```

### 2. 放宽签到条件

**文件：** `cloudfunctions/activity/index.js`

**修改 `handleSelfCheckIn` 函数：**

```javascript
// 当前代码：只允许 ongoing 状态签到
if (activity.status !== 'ongoing') {
  return { code: -1, message: '活动未开始或已结束' };
}

// 修改为：允许 published 或 ongoing 状态签到
if (!['published', 'ongoing'].includes(activity.status)) {
  return { code: -1, message: '活动未开始或已结束' };
}
```

**文件：** `miniprogram/pages/scan-checkin/scan-checkin.js`

**修改 `loadActivity` 函数：**

```javascript
// 当前代码
if (activity.status !== 'ongoing') {
  // ...
}

// 修改为
if (!['published', 'ongoing'].includes(activity.status)) {
  // ...
}
```

### 3. 定时刷新签到人数

**文件：** `miniprogram/pages/admin-activities/admin-activities.js`

**实现逻辑：**

```javascript
// 在 showCheckInQrCode 中启动定时器
showCheckInQrCode: async function (e) {
  // ... 获取签到码 ...

  // 启动定时刷新
  this._checkInTimer = setInterval(() => {
    this.refreshCheckInCount(id);
  }, 5000);
}

// 新增刷新签到人数方法
refreshCheckInCount: async function (activityId) {
  try {
    const result = await activityApi.getCheckInQrCode({ id: activityId });
    this.setData({ checkInCount: result.check_in_count || 0 });
  } catch (error) {
    console.error('刷新签到人数失败', error);
  }
}

// 在 closeCheckInQrCode 中清除定时器
closeCheckInQrCode: function () {
  if (this._checkInTimer) {
    clearInterval(this._checkInTimer);
    this._checkInTimer = null;
  }
  this.setData({ showCheckInQr: false });
}
```

## 修改文件清单

| 文件 | 修改类型 | 说明 |
|------|----------|------|
| `cloudfunctions/activity/index.js` | 修改 | getCheckInQrCode 返回 URL；selfCheckIn 放宽状态条件 |
| `miniprogram/pages/scan-checkin/scan-checkin.js` | 修改 | loadActivity 放宽状态条件 |
| `miniprogram/pages/admin-activities/admin-activities.js` | 修改 | 弹窗定时刷新签到人数 |

## 验收标准

1. 管理员点击"签到码"按钮，弹窗正确显示小程序码图片
2. 活动状态为 `published` 时，已报名团员可以扫码签到成功
3. 活动状态为 `ongoing` 时，已报名团员可以扫码签到成功
4. 签到码弹窗打开期间，签到人数每 5 秒自动刷新
5. 关闭弹窗后，定时器被正确清除

## 任务列表

- [ ] Task 1: 修改云函数 getCheckInQrCode 返回 URL
- [ ] Task 2: 修改云函数 selfCheckIn 放宽签到条件
- [ ] Task 3: 修改 scan-checkin.js 放宽签到条件
- [ ] Task 4: 修改 admin-activities.js 添加定时刷新
- [ ] Task 5: 部署云函数并测试