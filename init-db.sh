#!/bin/bash

# 初始化云开发数据库脚本
# 使用微信开发者工具 CLI 调用云函数

PROJECT_PATH="/Users/xu/Documents/SRC_wechat"
APPID="wxfab0c5bd74364f44"
ENV_ID="cloud1-2gyhe7s5efa4155f"

echo "========================================"
echo "正在初始化云开发数据库..."
echo "========================================"

# 首先清除初始化标记
echo "清除初始化标记..."
rm -rf "$PROJECT_PATH/miniprogram/.idea" 2>/dev/null

# 尝试调用云函数
echo "调用 init 云函数..."

# 使用 node 脚本调用云函数
node -e "
const cloud = require('wx-server-sdk');
cloud.init({ env: '$ENV_ID' });

const db = cloud.database();

async function init() {
  const collections = ['users', 'activities', 'registrations', 'products', 'orders', 'point_logs', 'reviews'];

  for (const collection of collections) {
    try {
      await db.createCollection(collection);
      console.log('✅ 创建集合成功:', collection);
    } catch (error) {
      if (error.errCode === -502004) {
        console.log('⚠️  集合已存在:', collection);
      } else {
        console.log('❌ 创建失败:', collection, error.message);
      }
    }
  }

  console.log('\\n========================================');
  console.log('初始化完成！');
  console.log('========================================');
  process.exit(0);
}

init().catch(err => {
  console.error('错误:', err);
  process.exit(1);
});
"
