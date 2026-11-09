#!/bin/bash
cd "$(dirname "$0")" || exit 1
if ! command -v python3 >/dev/null 2>&1; then
  echo "没有找到 python3。请先安装 Xcode 命令行工具（xcode-select --install）。"
  read -r -p "按回车键关闭…" _
  exit 1
fi
python3 server.py
