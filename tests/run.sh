#!/usr/bin/env bash
# 运行工作台自动化测试（macOS + Chrome）
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CHROME="${CHROME_PATH:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"

if [ ! -x "$CHROME" ]; then
  echo "找不到 Chrome：$CHROME"
  echo "可以用 CHROME_PATH=/path/to/chrome bash tests/run.sh 指定"
  exit 2
fi

PROFILE="$(mktemp -d)"
DUMP="$(mktemp)"
trap 'rm -rf "$PROFILE" "$DUMP"' EXIT

URL="file://$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$ROOT/tests/test.html")"

"$CHROME" --headless=new --disable-gpu --no-sandbox \
  --user-data-dir="$PROFILE" --window-size=1440,1000 \
  --virtual-time-budget=15000 --dump-dom "$URL" > "$DUMP" 2>/dev/null

python3 - "$DUMP" <<'PY'
import html, re, sys

src = open(sys.argv[1], encoding='utf-8', errors='replace').read()
m = re.search(r'<pre id="results">(.*?)</pre>', src, re.S)
if not m:
    print('没有拿到测试结果：页面可能没加载完')
    sys.exit(2)
text = html.unescape(re.sub(r'<[^>]+>', '', m.group(1))).strip()
print(text)
lines = text.splitlines()
fails = [l for l in lines if l.startswith('FAIL')]
summary = [l for l in lines if l.startswith('SUMMARY')]
if fails:
    print('\n测试未通过：%d 项失败' % len(fails))
    sys.exit(1)
print('\n全部测试通过')
sys.exit(0)
PY
