#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Xya 的工作台 —— 本地数据服务

用途：
  · 把网页界面跑在 http://127.0.0.1 上
  · 把数据保存成电脑上的一个独立 JSON 文件
  · 只监听本机，不对外网开放

用法：
  python3 server.py                 # 启动并自动打开浏览器
  python3 server.py --no-browser    # 不自动打开浏览器
  python3 server.py --port 9000     # 指定端口
"""

import argparse
import json
import os
import socket
import sys
import threading
import time
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_FILENAME = "工作台数据.json"
MAX_BODY = 50 * 1024 * 1024  # 50MB，个人数据足够


class DataStore(object):
    def __init__(self, data_dir):
        self.data_dir = data_dir
        os.makedirs(self.data_dir, exist_ok=True)
        self.path = os.path.join(self.data_dir, DATA_FILENAME)

    def exists(self):
        return os.path.exists(self.path)

    def read(self):
        if not self.exists():
            return None
        with open(self.path, "r", encoding="utf-8") as fh:
            return json.load(fh)

    def saved_at(self):
        if not self.exists():
            return None
        return int(os.path.getmtime(self.path) * 1000)

    def write(self, data):
        tmp = self.path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False, indent=2)
        os.replace(tmp, self.path)
        return self.saved_at()


def build_handler(store):
    class Handler(SimpleHTTPRequestHandler):
        extensions_map = {
            **SimpleHTTPRequestHandler.extensions_map,
            ".webmanifest": "application/manifest+json; charset=utf-8",
            ".png": "image/png",
            ".svg": "image/svg+xml",
        }

        def __init__(self, *args, **kwargs):
            kwargs["directory"] = ROOT
            SimpleHTTPRequestHandler.__init__(self, *args, **kwargs)

        def guess_type(self, path):
            base = super().guess_type(path).split(";")[0].strip()
            if base in (
                "text/html",
                "text/css",
                "text/javascript",
                "application/javascript",
                "application/json",
                "application/manifest+json",
            ):
                return base + "; charset=utf-8"
            return base

        def log_message(self, fmt, *args):
            # 安静模式：只在出错时输出
            pass

        def end_headers(self):
            path = self.path.split("?")[0]
            if not path.startswith("/api/") and (
                path == "/"
                or path.endswith((".html", ".js", ".css", ".json", ".webmanifest", ".svg", ".png"))
            ):
                self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
                self.send_header("Pragma", "no-cache")
                self.send_header("Expires", "0")
            super().end_headers()

        def send_json(self, payload, status=200):
            body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            path = self.path.split("?")[0]
            if path == "/api/health":
                self.send_json({"ok": True, "pid": os.getpid()})
                return
            if path == "/api/state":
                try:
                    self.send_json(
                        {
                            "ok": True,
                            "data": store.read(),
                            "path": store.path,
                            "savedAt": store.saved_at(),
                        }
                    )
                except Exception as exc:  # noqa: BLE001
                    self.send_json({"ok": False, "error": str(exc)}, status=500)
                return
            if path.startswith("/data/") or "/." in path:
                self.send_json({"ok": False, "error": "not found"}, status=404)
                return
            return SimpleHTTPRequestHandler.do_GET(self)

        def do_PUT(self):
            path = self.path.split("?")[0]
            if path != "/api/state":
                self.send_json({"ok": False, "error": "not found"}, status=404)
                return
            try:
                length = int(self.headers.get("Content-Length") or 0)
                if length <= 0 or length > MAX_BODY:
                    self.send_json({"ok": False, "error": "bad length"}, status=400)
                    return
                raw = self.rfile.read(length)
                payload = json.loads(raw.decode("utf-8"))
                data = payload.get("data", payload) if isinstance(payload, dict) else None
                if not isinstance(data, dict):
                    self.send_json({"ok": False, "error": "data must be an object"}, status=400)
                    return
                saved = store.write(data)
                self.send_json({"ok": True, "path": store.path, "savedAt": saved})
            except Exception as exc:  # noqa: BLE001
                self.send_json({"ok": False, "error": str(exc)}, status=500)

    return Handler


def already_running(port):
    """观察端口上是否已经有一个正在运行的工作台服务。"""
    import urllib.request

    try:
        with urllib.request.urlopen("http://127.0.0.1:%d/api/health" % port, timeout=0.5) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
            return bool(payload.get("ok"))
    except Exception:  # noqa: BLE001
        return False


def lan_ip():
    """当前 Wi-Fi 下的局域网 IP；拿不到就返回空字符串。"""
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(("8.8.8.8", 80))
        return sock.getsockname()[0]
    except OSError:
        return ""
    finally:
        sock.close()


def pick_port(start, host="127.0.0.1"):
    for offset in range(0, 20):
        candidate = start + offset
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            sock.bind((host, candidate))
            sock.close()
            return candidate
        except OSError:
            sock.close()
    raise SystemExit("找不到可用端口，请用 --port 指定")


def main():
    parser = argparse.ArgumentParser(description="Xya 的工作台本地服务")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--data-dir", default=os.path.join(ROOT, "data"))
    parser.add_argument("--no-browser", action="store_true")
    parser.add_argument("--lan", action="store_true", help="允许同一 Wi-Fi 下的手机访问")
    args = parser.parse_args()

    if args.port == 8765 and already_running(args.port):
        url = "http://127.0.0.1:%d/" % args.port
        if args.lan:
            print("工作台已经在运行，但只监听本机。", flush=True)
            print("如果要让手机访问，请先关闭原来的工作台窗口，再运行「启动手机访问（同一Wi-Fi）.command」。", flush=True)
        else:
            print("工作台已经在运行：%s" % url, flush=True)
            if not args.no_browser:
                webbrowser.open(url)
        return

    host = "0.0.0.0" if args.lan else "127.0.0.1"
    store = DataStore(os.path.abspath(args.data_dir))
    port = pick_port(args.port, host)
    server = ThreadingHTTPServer((host, port), build_handler(store))
    url = "http://127.0.0.1:%d/" % port

    print("", flush=True)
    print("  Xya 的工作台", flush=True)
    print("  ----------------------------------------", flush=True)
    print("  本机地址：%s" % url, flush=True)
    if args.lan:
        ip = lan_ip()
        if ip:
            print("  手机地址：http://%s:%d/   （iPhone 和 Mac 连同一个 Wi-Fi）" % (ip, port), flush=True)
        else:
            print("  手机地址：没有拿到局域网 IP，请检查 Wi-Fi", flush=True)
    else:
        print("  只在本机运行；手机访问请用「启动手机访问（同一Wi-Fi）.command」", flush=True)
    print("  数据：%s" % store.path, flush=True)
    print("  关闭这个窗口即停止服务", flush=True)
    print("", flush=True)

    if not args.no_browser:
        threading.Timer(1.0, lambda: webbrowser.open(url)).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n已停止。")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
