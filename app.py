#!/usr/bin/env python3
"""
DairyWalla - Local server launcher
Run: python app.py
"""

import http.server
import socketserver
import socket
import os
import webbrowser
import threading
import time

PORT = 8080
DIST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dairy-setu", "dist")


class SPAHandler(http.server.SimpleHTTPRequestHandler):
    """Serve a Single Page Application — all unknown paths return index.html."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST_DIR, **kwargs)

    def do_GET(self):
        requested = os.path.join(DIST_DIR, self.path.lstrip("/"))
        if os.path.isfile(requested):
            super().do_GET()
        else:
            self.path = "/index.html"
            super().do_GET()

    def log_message(self, format, *args):
        pass  # suppress noisy logs


def open_browser(port):
    time.sleep(1.2)
    webbrowser.open(f"http://localhost:{port}")

def find_available_port(start_port):
    port = start_port
    while True:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("", port))
                return port
            except OSError:
                port += 1

class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


if __name__ == "__main__":
    if not os.path.isdir(DIST_DIR):
        print("Build nahi mila. Pehle ye run karo:")
        print("  cd dairy-setu && npm run build")
        exit(1)

    server_port = find_available_port(PORT)
    if server_port != PORT:
        print(f"Port {PORT} busy hai, fallback port {server_port} use ho raha hai.")

    print("=" * 50)
    print("  DairyWalla")
    print("=" * 50)
    print(f"  http://localhost:{server_port}")
    print("  Browser automatically khul raha hai...")
    print("  Band karne ke liye: Ctrl+C")
    print("=" * 50)

    threading.Thread(target=open_browser, args=(server_port,), daemon=True).start()

    with ReusableTCPServer(("", server_port), SPAHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n  Server band ho gaya.")
