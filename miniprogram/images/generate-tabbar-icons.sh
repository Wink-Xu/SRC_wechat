#!/bin/bash

# tabBar 图标：活动 (activity), 周边 (shop), 我的 (profile)
# 每个图标需要两个状态：默认状态（灰色 #999999）和选中状态（黑色 #1A1A1A）

# 活动图标 - 闪电
ACTIVITY_SVG="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='STROKE_COLOR'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M13 10V3L4 14h7v7l9-11h-7z'/%3E%3C/svg%3E"

# 周边图标 - 购物袋
SHOP_SVG="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='STROKE_COLOR'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z'/%3E%3C/svg%3E"

# 我的图标 - 用户
PROFILE_SVG="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='STROKE_COLOR'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'/%3E%3C/svg%3E"

# 颜色
GRAY="999999"
BLACK="1A1A1A"

# 使用 curl 调用在线 API 生成 PNG
generate_icon() {
  local name=$1
  local svg_template=$2
  local color=$3
  local output=$4
  
  local svg="${svg_template/STROKE_COLOR/$color}"
  local encoded_svg=$(python3 -c "import urllib.parse; print(urllib.parse.quote('''$svg'''))")
  
  curl -s "https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=$encoded_svg" > "$output"
  echo "Generated: $output"
}

echo "此脚本需要手动执行 SVG 到 PNG 转换"
echo "请使用在线工具或本地工具将以下 SVG 转换为 80x80 PNG:"
echo ""
echo "活动图标 (灰色): ${ACTIVITY_SVG/STROKE_COLOR/$GRAY}"
echo "活动图标 (黑色): ${ACTIVITY_SVG/STROKE_COLOR/$BLACK}"
echo "周边图标 (灰色): ${SHOP_SVG/STROKE_COLOR/$GRAY}"
echo "周边图标 (黑色): ${SHOP_SVG/STROKE_COLOR/$BLACK}"
echo "我的图标 (灰色): ${PROFILE_SVG/STROKE_COLOR/$GRAY}"
echo "我的图标 (黑色): ${PROFILE_SVG/STROKE_COLOR/$BLACK}"
