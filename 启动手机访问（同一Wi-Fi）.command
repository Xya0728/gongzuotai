#!/bin/bash
# 让同一 Wi-Fi 下的 iPhone 通过局域网 IP 访问工作台（不需要安装任何手机 App）
cd "$(dirname "$0")" || exit 1
if ! command -v python3 >/dev/null 2>&1; then
  echo "没有找到 python3。请先安装 Xcode 命令行工具：xcode-select --install"
  read -r -p "按回车关闭…" _
  exit 1
fi
echo "正在以「局域网可访问」模式启动工作台…"
echo "请让 iPhone 和这台 Mac 连同一个 Wi-Fi。"
echo ""
python3 server.py --lan
