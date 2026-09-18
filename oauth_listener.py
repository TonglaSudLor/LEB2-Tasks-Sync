#!/usr/bin/env python3
import contextlib
import io
import threading
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer

import oauth_setup

oauth_setup.REDIRECT_URI = 'http://localhost:8766'


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    def do_GET(self):
        try:
            oauth_setup.exchange('http://localhost:8766' + self.path)
            body = b'<h1>Google Tasks connected</h1><p>You can close this tab and return to Hermes.</p>'
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except Exception as exc:
            body = ('<h1>Authorization failed</h1><pre>' + str(exc) + '</pre>').encode()
            self.send_response(400)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)


def main():
    server = HTTPServer(('127.0.0.1', 8766), Handler)
    capture = io.StringIO()
    with contextlib.redirect_stdout(capture):
        oauth_setup.auth_url()
    url = capture.getvalue().strip()
    print('Waiting for Google authorization in Brave...')
    webbrowser.get('windows-default').open(url)
    server.handle_request()


if __name__ == '__main__':
    main()
