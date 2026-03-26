# CLAUDE.md - SundayRunningClub 开发配置

## 项目概述

- **项目名称**: SundayRunningClub
- **AppID**: wxfab0c5bd74364f44
- **云开发环境 ID**: cloud1-2gyhe7s5efa4155f
- **项目路径**: /Users/xu/Documents/SRC_wechat

---

## 自动化环境

### 前置要求

- [x] 微信开发者工具已安装并开启服务端口
- [x] 已登录微信开发者工具
- [x] 服务端口 HTTP API 可用（端口 16792）

### CLI 工具路径

```bash
# Mac 微信开发者工具 CLI 路径
CLI_PATH="/Applications/wechatwebdevtools.app/Contents/MacOS/cli"
```

---

## 自动化指令

### 1. 上传/部署单个云函数

当创建或修改云函数后，自动执行：

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli cloud functions deploy \
  --env "cloud1-2gyhe7s5efa4155f" \
  --names "<函数名>" \
  --project "/Users/xu/Documents/SRC_wechat"
```

**使用示例：**
```bash
# 部署 user 云函数
/Applications/wechatwebdevtools.app/Contents/MacOS/cli cloud functions deploy \
  --env "cloud1-2gyhe7s5efa4155f" \
  --names "user" \
  --project "/Users/xu/Documents/SRC_wechat"
```

---

### 2. 查询云函数状态

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli cloud functions list \
  --env "cloud1-2gyhe7s5efa4155f" \
  --project "/Users/xu/Documents/SRC_wechat"
```

---

### 3. 预览小程序

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli preview \
  --project "/Users/xu/Documents/SRC_wechat"
```

---

### 4. 上传小程序代码

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli upload \
  --project "/Users/xu/Documents/SRC_wechat" \
  --version "1.0.0" \
  --desc "自动上传"
```

---

## 项目结构

```
/Users/xu/Documents/SRC_wechat/
├── miniprogram/                    # 小程序前端目录
│   ├── pages/                      # 页面
│   ├── utils/                      # 工具类
│   ├── components/                 # 组件
│   └── app.js                      # 小程序入口
├── cloudfunctions/                 # 云函数目录
│   ├── user/                       # 用户管理
│   ├── activity/                   # 活动管理
│   ├── admin/                      # 管理后台
│   ├── points/                     # 积分管理
│   ├── shop/                       # 商城管理
├── project.config.json             # 项目配置
└── CLAUDE.md                       # 本配置文件
```

---

## 云函数列表

| 云函数 | 用途 | 部署优先级 |
|--------|------|-----------|
| user | 用户登录、审批、角色（含团长自动配置） | 高 - 核心功能 |
| activity | 活动创建、报名、签到 | 高 - 核心功能 |
| points | 积分管理 | 中 |
| shop | 商城商品、订单 | 中 |
| admin | 管理后台 | 中 |

---

## 自动化部署流程

### AI 自主部署云函数的步骤

1. **创建/修改云函数代码**

2. **等待依赖安装**（如修改了 package.json）

3. **执行部署命令**：
   ```bash
   /Applications/wechatwebdevtools.app/Contents/MacOS/cli cloud functions deploy \
     --env "cloud1-2gyhe7s5efa4155f" \
     --names "<函数名>" \
     --project "/Users/xu/Documents/SRC_wechat"
   ```

4. **等待部署成功**（输出 `✔ deploy cloudfunctions`）

5. **验证部署**：
   ```bash
   /Applications/wechatwebdevtools.app/Contents/MacOS/cli cloud functions list \
     --env "cloud1-2gyhe7s5efa4155f" \
     --project "/Users/xu/Documents/SRC_wechat"
   ```

6. **如部署失败**，等待 5 秒后重试（处理 Creating 状态冲突）

---

## 开发规范

### JavaScript 语法规范

- **函数定义**使用 `functionName: async function () {}` 格式
- 不要使用 `async functionName: function () {}` 语法（小程序不支持）

### 云函数开发规范

1. 每个云函数目录必须包含：
   - `index.js` - 入口文件
   - `package.json` - 依赖配置
   - `project.config.json` - 项目配置（含云环境 ID）

2. 云函数入口格式：
   ```javascript
   const cloud = require('wx-server-sdk');
   cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
   const db = cloud.database();

   exports.main = async (event, context) => {
     const wxContext = cloud.getWXContext();
     const { action } = event;

     switch (action) {
       case 'login': return await handleLogin(data, wxContext, openid);
       // ...
       default: return { code: -1, message: '未知操作' };
     }
   };
   ```

---

## 团长配置

在 `cloudfunctions/user/index.js` 中配置团长 openid：

```javascript
const LEADER_OPENID = 'YOUR_LEADER_OPENID_HERE'; // 替换为实际团长 openid
```

当用户登录时，如果 openid 匹配团长配置，会自动设置为团长角色。

---

## 常见问题

### Q: CLI 返回 "tunneling socket could not be established"
**A**: 重启微信开发者工具，等待 10 秒让 HTTP 服务启动

### Q: 云函数处于 Creating 状态无法部署
**A**: 等待 5 秒后重试部署命令

### Q: 小程序编译报错 "Unexpected token"
**A**: 检查函数定义语法，确保使用 `name: async function () {}` 格式

---

## 上传体验版流程

### 方法一：CLI 命令上传（推荐）

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli upload \
  --project "/Users/xu/Documents/SRC_wechat" \
  --version "1.0.0" \
  --desc "版本描述"
```

### 方法二：开发者工具手动上传

1. 点击开发者工具右上角 **"上传"** 按钮
2. 填写版本号和描述
3. 点击上传

### 上传后设置体验版

1. 打开 **微信公众平台** (mp.weixin.qq.com)
2. 进入 **管理** → **版本管理**
3. 找到刚上传的版本，点击 **"选为体验版"**
4. 生成二维码，发给体验用户扫码测试
