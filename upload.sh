#!/bin/bash
# 云函数上传脚本
# 使用方法：./upload.sh <云函数名称>

FUNCTION_NAME=$1
PROJECT_DIR="/Users/xu/Documents/SRC_wechat"

echo "📦 正在上传云函数：$FUNCTION_NAME"
echo "📁 项目目录：$PROJECT_DIR"
echo "📂 云函数目录：$PROJECT_DIR/cloudfunctions/$FUNCTION_NAME"

# 切换到云函数目录
cd "$PROJECT_DIR/cloudfunctions/$FUNCTION_NAME"

# 使用 CLI 上传（从云函数目录）
/Applications/wechatwebdevtools.app/Contents/MacOS/cli upload \
  --project "$PROJECT_DIR" \
  --version "1.0.0" \
  --desc "$FUNCTION_NAME cloud function" \
  "$PROJECT_DIR/cloudfunctions/$FUNCTION_NAME"

echo "✅ 上传完成"
