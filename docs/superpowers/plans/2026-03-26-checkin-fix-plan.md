# 扫码签到功能修复 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复扫码签到功能，使签到码可显示、签到条件放宽、签到人数实时刷新。

**Architecture:** 修改云函数返回签到码 URL、放宽签到状态检查、前端定时刷新签到人数。

**Tech Stack:** 微信小程序原生开发、微信云开发（云函数）、JavaScript

---

## 文件结构

| 文件 | 类型 | 说明 |
|------|------|------|
| `cloudfunctions/activity/index.js` | 修改 | getCheckInQrCode 返回 URL；selfCheckIn 放宽状态条件 |
| `miniprogram/pages/scan-checkin/scan-checkin.js` | 修改 | loadActivity 放宽状态条件 |
| `miniprogram/pages/admin-activities/admin-activities.js` | 修改 | 弹窗定时刷新签到人数 |

---

### Task 1: 修改云函数 getCheckInQrCode 返回 URL

**Files:**
- Modify: `cloudfunctions/activity/index.js` (handleGetCheckInQrCode 函数)

- [ ] **Step 1: 找到 handleGetCheckInQrCode 函数并修改返回逻辑**

定位到 `handleGetCheckInQrCode` 函数（约第 600-668 行），在上传云存储成功后，添加 `getTempFileURL` 调用。

修改后的代码：

```javascript
// 获取签到小程序码
async function handleGetCheckInQrCode(data, wxContext, testOpenid) {
  const { activityId, id } = data;
  const actualActivityId = activityId || id;

  try {
    const user = await getUser(wxContext.OPENID, testOpenid);

    if (!user || !['admin', 'leader'].includes(user.role)) {
      return { code: -1, message: '没有权限' };
    }

    // 获取活动
    const activityResult = await db.collection('activities').doc(actualActivityId).get();
    const activity = activityResult.data;

    if (!activity) {
      return { code: -1, message: '活动不存在' };
    }

    // 生成小程序码
    const scene = actualActivityId;

    try {
      const qrResult = await cloud.openapi.wxacode.getUnlimited({
        scene: scene,
        page: 'pages/scan-checkin/scan-checkin',
        width: 430
      });

      // 上传到云存储
      const cloudPath = `checkin_qrcodes/${actualActivityId}_${Date.now()}.png`;
      const uploadResult = await cloud.uploadFile({
        cloudPath: cloudPath,
        fileContent: qrResult.buffer
      });

      // 获取临时访问 URL
      const tempUrlResult = await cloud.getTempFileURL({
        fileList: [uploadResult.fileID]
      });

      const qrCodeUrl = tempUrlResult.fileList[0] && tempUrlResult.fileList[0].tempFileURL
        ? tempUrlResult.fileList[0].tempFileURL
        : uploadResult.fileID;

      return {
        code: 0,
        data: {
          activity_id: actualActivityId,
          qr_code: qrCodeUrl,
          check_in_count: activity.check_in_count || 0
        }
      };
    } catch (qrError) {
      console.error('生成小程序码失败，使用备用二维码', qrError);
      // 如果生成小程序码失败，使用普通二维码
      const qrContent = JSON.stringify({
        type: 'checkin',
        activity_id: actualActivityId
      });
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrContent)}`;

      return {
        code: 0,
        data: {
          activity_id: actualActivityId,
          qr_code: qrCodeUrl,
          check_in_count: activity.check_in_count || 0
        }
      };
    }
  } catch (error) {
    console.error('获取签到码失败', error);
    return { code: -1, message: '获取失败' };
  }
}
```

- [ ] **Step 2: 部署云函数**

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli cloud functions deploy \
  --env "cloud1-2gyhe7s5efa4155f" \
  --names "activity" \
  --project "/Users/xu/Documents/SRC_wechat"
```

Expected: `✔ deploy cloudfunctions`

---

### Task 2: 修改云函数 selfCheckIn 放宽签到条件

**Files:**
- Modify: `cloudfunctions/activity/index.js` (handleSelfCheckIn 函数)

- [ ] **Step 1: 找到 handleSelfCheckIn 函数并修改状态检查**

定位到 `handleSelfCheckIn` 函数（约第 670-743 行），修改状态检查逻辑。

修改前：
```javascript
if (activity.status !== 'ongoing') {
  return { code: -1, message: '活动未开始或已结束' };
}
```

修改后：
```javascript
if (!['published', 'ongoing'].includes(activity.status)) {
  return { code: -1, message: '活动未开始或已结束' };
}
```

- [ ] **Step 2: 部署云函数**

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli cloud functions deploy \
  --env "cloud1-2gyhe7s5efa4155f" \
  --names "activity" \
  --project "/Users/xu/Documents/SRC_wechat"
```

Expected: `✔ deploy cloudfunctions`

---

### Task 3: 修改 scan-checkin.js 放宽签到条件

**Files:**
- Modify: `miniprogram/pages/scan-checkin/scan-checkin.js`

- [ ] **Step 1: 找到 loadActivity 函数并修改状态检查**

定位到 `loadActivity` 函数（约第 45-90 行），修改状态检查逻辑。

修改前：
```javascript
// 检查活动状态
if (activity.status !== 'ongoing') {
  this.setData({
    loading: false,
    error: '活动未开始或已结束，无法签到'
  });
  return;
}
```

修改后：
```javascript
// 检查活动状态
if (!['published', 'ongoing'].includes(activity.status)) {
  this.setData({
    loading: false,
    error: '活动未开始或已结束，无法签到'
  });
  return;
}
```

- [ ] **Step 2: 验证修改**

确认文件保存成功，语法正确。

---

### Task 4: 修改 admin-activities.js 添加定时刷新

**Files:**
- Modify: `miniprogram/pages/admin-activities/admin-activities.js`

- [ ] **Step 1: 修改 showCheckInQrCode 函数，添加定时器**

定位到 `showCheckInQrCode` 函数（约第 223-241 行），在设置数据后启动定时器。

修改后的函数：

```javascript
// 显示签到码
showCheckInQrCode: async function (e) {
  const { id } = e.currentTarget.dataset;

  try {
    const result = await activityApi.getCheckInQrCode({ id });
    this.setData({
      currentActivityId: id,
      checkInQrCode: result.qr_code,
      checkInCount: result.check_in_count || 0,
      showCheckInQr: true
    });

    // 启动定时刷新签到人数（每5秒）
    this._checkInTimer = setInterval(() => {
      this.refreshCheckInCount(id);
    }, 5000);
  } catch (error) {
    console.error('获取签到码失败', error);
    wx.showToast({
      title: '获取签到码失败',
      icon: 'none'
    });
  }
},
```

- [ ] **Step 2: 添加 refreshCheckInCount 方法**

在 `showCheckInQrCode` 函数后添加新方法：

```javascript
// 刷新签到人数
refreshCheckInCount: async function (activityId) {
  try {
    const result = await activityApi.getCheckInQrCode({ id: activityId });
    this.setData({ checkInCount: result.check_in_count || 0 });
  } catch (error) {
    console.error('刷新签到人数失败', error);
  }
},
```

- [ ] **Step 3: 修改 closeCheckInQrCode 函数，清除定时器**

定位到 `closeCheckInQrCode` 函数（约第 244-248 行），添加定时器清除逻辑。

修改后的函数：

```javascript
// 关闭签到码弹窗
closeCheckInQrCode: function () {
  // 清除定时器
  if (this._checkInTimer) {
    clearInterval(this._checkInTimer);
    this._checkInTimer = null;
  }
  this.setData({
    showCheckInQr: false
  });
},
```

- [ ] **Step 4: 在 onUnload 中也清除定时器**

找到 `onUnload` 函数（如果没有则添加），确保页面卸载时清除定时器：

```javascript
onUnload: function () {
  if (this._checkInTimer) {
    clearInterval(this._checkInTimer);
    this._checkInTimer = null;
  }
},
```

---

### Task 5: 提交代码并上传体验版

- [ ] **Step 1: 提交代码**

```bash
cd /Users/xu/Documents/SRC_wechat
git add -A
git commit -m "$(cat <<'EOF'
fix: 扫码签到功能修复

- 云函数 getCheckInQrCode 返回可访问的 URL
- 放宽签到条件：published/ongoing 状态都可签到
- 签到码弹窗每 5 秒自动刷新签到人数

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

Expected: 提交成功

- [ ] **Step 2: 推送到 GitHub**

```bash
git push origin main
```

Expected: 推送成功

- [ ] **Step 3: 上传体验版**

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli upload \
  --project "/Users/xu/Documents/SRC_wechat" \
  --version "1.0.4" \
  --desc "修复扫码签到：签到码显示、放宽条件、实时人数"
```

Expected: `✔ upload`

---

## 验收清单

- [ ] 管理员点击"签到码"按钮，弹窗正确显示小程序码图片
- [ ] 活动状态为 `published` 时，已报名团员可以扫码签到成功
- [ ] 签到码弹窗打开期间，签到人数每 5 秒自动刷新
- [ ] 关闭弹窗或离开页面后，定时器被正确清除