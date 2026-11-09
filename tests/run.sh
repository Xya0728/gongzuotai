#!/usr/bin/env bash
# 运行 Xya 的工作台自动化测试
#   1) 直接打开文件（localStorage 模式）
#   2) 本地数据服务（数据文件模式）
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CHROME="${CHROME_PATH:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
PYTHON="${PYTHON:-python3}"

if [ ! -x "$CHROME" ]; then
  echo "找不到 Chrome：$CHROME"
  echo "可以用 CHROME_PATH=/path/to/chrome bash tests/run.sh 指定"
  exit 2
fi

WORK="$(mktemp -d)"
SERVER_PID=""
cleanup() {
  if [ -n "$SERVER_PID" ]; then
    disown "$SERVER_PID" 2>/dev/null
    kill "$SERVER_PID" 2>/dev/null
    wait "$SERVER_PID" 2>/dev/null
  fi
  rm -rf "$WORK"
}
trap cleanup EXIT

parse() {
  "$PYTHON" - "$1" "$2" <<'PY'
import html, re, sys

src = open(sys.argv[1], encoding='utf-8', errors='replace').read()
label = sys.argv[2]
m = re.search(r'<pre id="results">(.*?)</pre>', src, re.S)
if not m:
    print('[' + label + '] 没有拿到测试结果：页面可能没加载完')
    sys.exit(2)
text = html.unescape(re.sub(r'<[^>]+>', '', m.group(1))).strip()
print('===== ' + label + ' =====')
print(text)
fails = [l for l in text.splitlines() if l.startswith('FAIL')]
if fails:
    print('[' + label + '] 未通过：%d 项失败' % len(fails))
    sys.exit(1)
print('[' + label + '] 全部通过')
PY
}

# ---------- 1. 文件模式 ----------
PROFILE1="$WORK/profile1"
URL1="file://$("$PYTHON" -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$ROOT/tests/test.html")"
"$CHROME" --headless=new --disable-gpu --no-sandbox \
  --user-data-dir="$PROFILE1" --window-size=1440,1000 \
  --virtual-time-budget=15000 --dump-dom "$URL1" > "$WORK/dump1.html" 2>/dev/null
parse "$WORK/dump1.html" "文件模式"
RESULT1=$?

# ---------- 2. 数据服务模式 ----------
DATA_DIR="$WORK/data"
"$PYTHON" -u "$ROOT/server.py" --port 8791 --data-dir "$DATA_DIR" --no-browser > "$WORK/server.log" 2>&1 &
SERVER_PID=$!
PORT=""
for i in $(seq 1 60); do
  PORT="$("$PYTHON" - "$WORK/server.log" <<'PY'
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
  echo "[数据服务] 启动失败"
  cat "$WORK/server.log"
  exit 2
fi

PROFILE2="$WORK/profile2"
"$CHROME" --headless=new --disable-gpu --no-sandbox \
  --user-data-dir="$PROFILE2" --window-size=1440,1000 \
  --virtual-time-budget=20000 --dump-dom "http://127.0.0.1:$PORT/tests/test.html" > "$WORK/dump2.html" 2>/dev/null
parse "$WORK/dump2.html" "数据文件模式"
RESULT2=$?

# ---------- 3. 数据服务接口测试 ----------
bash "$ROOT/tests/test_server.sh"
RESULT3=$?

echo ""
if [ "$RESULT1" -ne 0 ] || [ "$RESULT2" -ne 0 ] || [ "$RESULT3" -ne 0 ]; then
  echo "存在未通过的测试"
  exit 1
fi
echo "全部测试通过"
exit 0
