# 云开发测试工具使用说明

## 🎯 功能概述

这套测试工具解决了云开发模式下无法方便切换用户测试的问题，提供：

1. **测试用户管理** - 创建 7 个预定义的测试用户（团长、管理员、团员、待审批、游客）
2. **一键切换用户** - 在小程序内快速切换不同测试账号，无需重新登录
3. **测试数据管理** - 创建示例活动和商品数据
4. **数据清理/重置** - 快速重置测试环境

## 📦 云函数列表

### 1. test-user（测试用户管理）
- `createTestUsers` - 创建所有测试用户
- `listTestUsers` - 列出测试用户
- `switchToUser` - 切换到指定测试用户
- `resetTestUsers` - 重置测试用户
- `deleteTestUser` - 删除测试用户

### 2. test-data（测试数据管理）
- `initTestData` - 初始化测试数据（活动 + 商品）
- `createTestActivities` - 创建测试活动
- `createTestProducts` - 创建测试商品
- `resetAllData` - 重置所有数据
- `cleanupAllData` - 清理所有数据

## 🚀 部署步骤

### 方式一：微信开发者工具 UI 部署（推荐）

1. 打开微信开发者工具，加载项目
2. 在左侧文件树中找到 `cloudfunctions/test-user` 目录
3. 右键点击 `test-user` 文件夹 → 选择 **"上传并部署：云端安装依赖"**
4. 等待部署完成
5. 对 `cloudfunctions/test-data` 目录重复步骤 2-4

### 方式二：CLI 命令行部署

```bash
# 进入项目目录
cd /Users/xu/Documents/SRC_wechat

# 部署 test-user 云函数
/Applications/wechatwebdevtools.app/Contents/MacOS/cli upload \
  --project "." \
  --version "1.0.0" \
  --desc "test-user cloud function" \
  cloudfunctions/test-user

# 部署 test-data 云函数
/Applications/wechatwebdevtools.app/Contents/MacOS/cli upload \
  --project "." \
  --version "1.0.0" \
  --desc "test-data cloud function" \
  cloudfunctions/test-data
```

## 📱 使用方法

### 1. 首次使用

1. 打开小程序，进入"我的"页面
2. 点击 **"🛠️ 测试工具面板"** 按钮
3. 点击 **"创建测试用户"** 按钮
4. 点击 **"初始化测试数据"** 按钮

### 2. 切换用户测试

1. 在测试工具面板中，点击任意测试用户卡片
2. 系统会自动切换到该用户身份
3. 返回"我的"页面，查看该用户的权限和功能
4. 测试完成后，可再次切换其他用户

### 3. 测试用户列表

| 用户 ID | 昵称 | 角色 | 状态 | 用途 |
|--------|------|------|------|------|
| leader | 团长 - 测试 | leader | approved | 测试团长功能 |
| admin | 管理员 - 测试 | admin | approved | 测试管理员功能 |
| member1 | 团员 A- 跑步爱好者 | member | approved | 测试团员功能 |
| member2 | 团员 B- 晨跑达人 | member | approved | 测试团员功能 |
| member3 | 团员 C- 夜跑小王子 | member | approved | 测试团员功能 |
| pending | 待审批 - 新用户 | member | pending | 测试待审批状态 |
| guest | 游客用户 | member | guest | 测试游客状态 |

### 4. 数据管理

- **初始化测试数据**: 创建 5 个示例活动（包含正在报名、进行中、已结束）和 6 个商品
- **重置所有数据**: 删除所有活动、商品、订单等数据后重新创建
- **清理所有数据**: 仅删除数据，不重新创建

## 🔧 故障排除

### 问题：切换用户失败，提示"测试用户未在数据库中"

**解决**: 先点击"创建测试用户"按钮，在数据库中创建测试用户

### 问题：云函数部署失败

**解决**:
1. 检查 `package.json` 是否存在
2. 检查 `config.json` 是否存在
3. 在微信开发者工具中右键 → "云端安装依赖"

### 问题：切换用户后权限未刷新

**解决**: 切换成功后，退出小程序重新进入，或手动刷新页面

## 📝 注意事项

1. 测试用户仅用于开发测试，不要在生产环境使用
2. 测试用户的 OPENID 以 `test_openid_` 开头，与真实用户区分
3. 清理数据会删除所有活动、商品、订单等，请谨慎操作
4. 测试数据初始化不会删除已有数据，仅添加新数据

## 🛠️ 技术实现

### 测试用户识别

通过 OPENID 前缀识别测试用户：
```javascript
const TEST_OPEN_IDS = [
  'test_openid_leader_001',
  'test_openid_admin_001',
  'test_openid_member_001',
  'test_openid_member_002',
  'test_openid_member_003',
  'test_openid_pending_001',
  'test_openid_guest_001'
];
```

### 用户切换原理

1. 调用 `test-user.switchToUser` 云函数
2. 云函数返回测试用户的完整数据
3. 小程序端更新 `app.globalData`
4. 保存到本地存储 `wx.setStorageSync('userInfo', user)`

### 数据结构

**测试用户数据**:
```javascript
{
  openid: 'test_openid_leader_001',
  nickname: '团长 - 测试',
  avatar: '',
  phone: '13800138001',
  role: 'leader',
  status: 'approved',
  points: 1000
}
```

## 📖 相关文档

- [云开发文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)
- [微信开发者工具 CLI 文档](https://developers.weixin.qq.com/miniprogram/dev/devtools/cli.html)
