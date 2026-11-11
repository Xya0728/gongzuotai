#!/bin/bash
# 把本机 8765 端口通过 Tailscale 暴露成 HTTPS，供 iPhone 添加到主屏幕
cd "$(dirname "$0")" || exit 1

TS="/Applications/Tailscale.app/Contents/MacOS/Tailscale"
if [ ! -x "$TS" ]; then
  TS="$(command -v tailscale 2>/dev/null || true)"
fi

if [ -z "$TS" ]; then
  echo "没有找到 Tailscale。"
  echo "请先在 Mac 和 iPhone 上安装 Tailscale，并登录同一个账号："
  echo "  https://tailscale.com/download"
  read -r -p "按回车关闭…" _
  exit 1
fi

if ! curl -s --max-time 2 http://127.0.0.1:8765/api/health >/dev/null 2>&1; then
  echo "数据服务还没启动。"
  echo "请先双击「启动Xya的工作台.command」，保持那个终端窗口开着，再运行本脚本。"
  read -r -p "按回车关闭…" _
  exit 1
fi

echo "正在用 Tailscale 把 8765 端口转成 HTTPS…"
if ! "$TS" serve --bg 8765; then
  echo ""
  echo "自动配置失败。可以试试在终端手动执行："
  echo "  sudo \"$TS\" serve --bg 8765"
  echo "如果提示 HTTPS 未启用，请到 Tailscale 管理后台开启 HTTPS。"
  read -r -p "按回车关闭…" _
  exit 1
fi

echo ""
"$TS" serve status
echo ""
echo "在 iPhone 的 Safari 打开上面显示的 https:// 地址。"
echo "然后点「分享」→「添加到主屏幕」，以后从桌面图标打开。"
echo ""
echo "注意：只在自己的 tailnet 内可见，不要使用 tailscale funnel（会公开到互联网）。"
read -r -p "按回车关闭…" _
