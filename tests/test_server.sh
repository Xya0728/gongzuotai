#!/usr/bin/env bash
# 数据服务测试：文件读写、接口、静态页面、只读保护
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PYTHON="${PYTHON:-python3}"
DATA_DIR="$(mktemp -d)"
LOG="$(mktemp)"
SERVER_PID=""
FAIL=0

cleanup() {
  if [ -n "$SERVER_PID" ]; then
    disown "$SERVER_PID" 2>/dev/null
    kill "$SERVER_PID" 2>/dev/null
    wait "$SERVER_PID" 2>/dev/null
  fi
  rm -rf "$DATA_DIR" "$LOG"
}
trap cleanup EXIT

"$PYTHON" -u "$ROOT/server.py" --port 8797 --data-dir "$DATA_DIR" --no-browser > "$LOG" 2>&1 &
SERVER_PID=$!

PORT=""
for i in $(seq 1 60); do
  PORT="$("$PYTHON" - "$LOG" <<'PY'
import re, sys
try:
    text = open(sys.argv[1], encoding='utf-8', errors='replace').read()
except OSError:
    sys.exit(0)
m = re.search(r'127\.0\.0\.1:(\d+)', text)
print(m.group(1) if m else '')
PY
)"
  [ -n "$PORT" ] && break
  sleep 0.2
done

if [ -z "$PORT" ]; then
  echo "FAIL 数据服务启动失败"
  cat "$LOG"
  exit 1
fi

check() {
  local name="$1" cond="$2"
  if [ "$cond" -eq 0 ]; then
    echo "PASS $name"
  else
    echo "FAIL $name"
    FAIL=1
  fi
}

CODE=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/index.html")
[ "$CODE" = "200" ]; check "静态页面可访问（$CODE）" $?

CC=$(curl -sI "http://127.0.0.1:$PORT/js/core.js" | tr -d '\r' | awk -F': ' 'tolower($1)=="cache-control"{print $2}')
echo "$CC" | grep -q 'no-store'; check "静态资源不缓存（$CC）" $?

CC_HTML=$(curl -sI "http://127.0.0.1:$PORT/" | tr -d '\r' | awk -F': ' 'tolower($1)=="cache-control"{print $2}')
echo "$CC_HTML" | grep -q 'no-store'; check "首页不缓存（$CC_HTML）" $?

CT_HTML=$(curl -sI "http://127.0.0.1:$PORT/index.html" | tr -d '\r' | awk -F': ' 'tolower($1)=="content-type"{print $2}')
echo "$CT_HTML" | grep -q 'charset=utf-8'; check "HTML 带 UTF-8 声明（$CT_HTML）" $?

curl -s "http://127.0.0.1:$PORT/manifest.webmanifest" | grep -q '"display": "standalone"'; check "PWA manifest 可访问" $?
curl -s "http://127.0.0.1:$PORT/sw.js" | grep -q "xya-shell-"; check "Service Worker 已提供" $?
CODE=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/icons/icon-180.png")
[ "$CODE" = "200" ]; check "iPhone 图标可访问（$CODE）" $?
curl -s "http://127.0.0.1:$PORT/" | grep -q 'rel="manifest"'; check "首页声明 manifest" $?
curl -s "http://127.0.0.1:$PORT/" | grep -q 'apple-mobile-web-app-capable'; check "iOS 全屏 meta" $?
CT=$(curl -sI "http://127.0.0.1:$PORT/manifest.webmanifest" | tr -d '\r' | awk -F': ' 'tolower($1)=="content-type"{print $2}')
echo "$CT" | grep -q 'manifest+json'; check "manifest MIME（$CT）" $?

curl -s -X PUT -H 'Content-Type: application/json' \
  -d '{"data":{"version":1,"memos":[{"id":"t1","text":"file-test"}]}}' \
  "http://127.0.0.1:$PORT/api/state" > /dev/null
[ -f "$DATA_DIR/工作台数据.json" ]; check "数据写入独立文件" $?

grep -q 'file-test' "$DATA_DIR/工作台数据.json"; check "文件内容正确" $?

curl -s "http://127.0.0.1:$PORT/api/state" | grep -q 'file-test'; check "接口能读回数据" $?

CODE=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/data/%E5%B7%A5%E4%BD%9C%E5%8F%B0%E6%95%B0%E6%8D%AE.json")
[ "$CODE" = "404" ] || [ "$CODE" = "403" ]; check "数据文件不通过网页暴露（$CODE）" $?

CODE=$(curl -s -o /dev/null -w '%{http_code}' -X PUT -H 'Content-Type: application/json' -d '{"data":{"a":1}}' "http://127.0.0.1:$PORT/other")
[ "$CODE" = "404" ]; check "非数据接口拒绝写入（$CODE）" $?

LAN_DATA="$(mktemp -d)"
LAN_LOG="$(mktemp)"
"$PYTHON" -u "$ROOT/server.py" --port 8798 --lan --no-browser --data-dir "$LAN_DATA" > "$LAN_LOG" 2>&1 &
LAN_PID=$!
LAN_PORT=""
for i in $(seq 1 40); do
  LAN_PORT="$(grep -o '127\.0\.0\.1:[0-9]*' "$LAN_LOG" | head -1 | cut -d: -f2)"
  [ -n "$LAN_PORT" ] && break
  sleep 0.2
done
grep -q '手机地址' "$LAN_LOG"; check "局域网模式打印手机地址" $?
CODE=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$LAN_PORT/")
[ "$CODE" = "200" ]; check "局域网模式页面可访问（$CODE）" $?
disown "$LAN_PID" 2>/dev/null
kill "$LAN_PID" 2>/dev/null
wait "$LAN_PID" 2>/dev/null
rm -rf "$LAN_DATA" "$LAN_LOG"

echo ""
if [ "$FAIL" -ne 0 ]; then
  echo "数据服务测试未通过"
  exit 1
fi
echo "数据服务测试全部通过"
