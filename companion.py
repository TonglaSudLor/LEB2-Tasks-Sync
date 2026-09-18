#!/usr/bin/env python3
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
TOKEN_FILE = ROOT / 'google_token.json'
CLIENT_FILE = ROOT / 'google_client_secret.json'
BLOCKLIST_FILE = ROOT / 'blocked_users.json'
CONFIG_FILE = ROOT / 'companion_config.json'
PORT = 8765
EXTENSION_ID = 'fmgjobkajbcjcljfhjpcefldegeoconk'
API = 'https://tasks.googleapis.com/tasks/v1'


def load_config():
    if not CONFIG_FILE.exists():
        raise RuntimeError('Companion is not configured. Run: python setup.py')
    config = json.loads(CONFIG_FILE.read_text(encoding='utf-8'))
    secret = str(config.get('shared_secret', '')).strip()
    if len(secret) < 32:
        raise RuntimeError('Companion configuration is invalid. Run: python setup.py')
    return config


def request_json(url, method='GET', headers=None, data=None):
    encoded = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(url, data=encoded, method=method, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            body = response.read()
            return json.loads(body) if body else None
    except urllib.error.HTTPError as exc:
        body = exc.read().decode(errors='replace')
        raise RuntimeError(f'HTTP {exc.code}: {body[:500]}') from exc


def access_token():
    if not TOKEN_FILE.exists():
        raise RuntimeError('Google Tasks is not connected yet.')
    token = json.loads(TOKEN_FILE.read_text(encoding='utf-8'))
    if token.get('access_token') and time.time() < token.get('obtained_at', 0) + token.get('expires_in', 0) - 120:
        return token['access_token']
    client = json.loads(CLIENT_FILE.read_text(encoding='utf-8'))['installed']
    body = urllib.parse.urlencode({
        'client_id': client['client_id'],
        'client_secret': client['client_secret'],
        'refresh_token': token['refresh_token'],
        'grant_type': 'refresh_token'
    }).encode()
    req = urllib.request.Request('https://oauth2.googleapis.com/token', data=body, headers={'Content-Type': 'application/x-www-form-urlencoded'})
    with urllib.request.urlopen(req, timeout=30) as response:
        refreshed = json.load(response)
    token.update(refreshed)
    token['obtained_at'] = time.time()
    TOKEN_FILE.write_text(json.dumps(token, indent=2), encoding='utf-8')
    return token['access_token']


def google(path, method='GET', data=None):
    return request_json(API + path, method, {
        'Authorization': 'Bearer ' + access_token(),
        'Content-Type': 'application/json'
    }, data)


def load_blocked_users():
    if not BLOCKLIST_FILE.exists():
        return []
    data = json.loads(BLOCKLIST_FILE.read_text(encoding='utf-8'))
    return [str(value).strip() for value in data.get('blocked_leb2_student_ids', []) if str(value).strip()]


def authorization_error_message():
    return 'Unable to complete sync. Error code: E_SYNC_403.'


def is_allowed_leb2_user(user_id, blocked_users=None):
    candidate = str(user_id or '').strip()
    blocked = load_blocked_users() if blocked_users is None else [str(value).strip() for value in blocked_users]
    return bool(candidate) and candidate not in blocked


def list_tasks():
    tasks = []
    page_token = ''
    while True:
        query = {'showCompleted': 'true', 'showHidden': 'true', 'maxResults': '100'}
        if page_token:
            query['pageToken'] = page_token
        page = google('/lists/@default/tasks?' + urllib.parse.urlencode(query))
        tasks.extend(page.get('items', []))
        page_token = page.get('nextPageToken', '')
        if not page_token:
            return tasks


def preserve_manual_completion(existing, incoming):
    merged = dict(incoming)
    if existing and existing.get('status') == 'completed' and merged.get('status') == 'needsAction':
        merged.pop('status', None)
        merged.pop('completed', None)
    return merged


def task_changed(existing, incoming):
    return any(existing.get(key) != value for key, value in incoming.items())


def upsert(item, existing_tasks):
    marker = f"[LEB2_ACTIVITY_ID:{item['activityId']}]"
    existing = next((task for task in existing_tasks if marker in task.get('notes', '')), None)
    task = preserve_manual_completion(existing, item['task'])
    if existing:
        if not task_changed(existing, task):
            return 'unchanged'
        task_id = urllib.parse.quote(existing['id'], safe='')
        google(f'/lists/@default/tasks/{task_id}', 'PATCH', task)
        return 'updated'
    created = google('/lists/@default/tasks', 'POST', task)
    existing_tasks.append(created)
    return 'created'


def sync(items):
    counts = {'created': 0, 'updated': 0, 'unchanged': 0, 'skipped': 0}
    existing_tasks = list_tasks()
    with ThreadPoolExecutor(max_workers=5) as pool:
        actions = pool.map(lambda item: upsert(item, existing_tasks), items)
        for action in actions:
            counts[action] += 1
    counts['tasks'] = len(items)
    counts['synced'] = counts['created'] + counts['updated'] + counts['unchanged']
    counts['message'] = f"{counts['created']} created, {counts['updated']} updated, {counts['unchanged']} unchanged."
    return counts


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    def _origin(self):
        origin = self.headers.get('Origin', '')
        allowed = f'chrome-extension://{EXTENSION_ID}'
        return origin if origin == allowed else allowed

    def _headers(self, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', self._origin())
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-LEB2-Secret')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.end_headers()

    def _reply(self, payload, status=200):
        self._headers(status)
        self.wfile.write(json.dumps(payload).encode())

    def _authorized(self):
        try:
            expected = load_config()['shared_secret']
        except Exception:
            return False
        return self.headers.get('X-LEB2-Secret') == expected

    def do_OPTIONS(self):
        self._headers(204)

    def do_GET(self):
        if self.path != '/status' or not self._authorized():
            return self._reply({'ok': False}, 403)
        try:
            access_token()
            self._reply({'ok': True, 'connected': True})
        except Exception as exc:
            self._reply({'ok': True, 'connected': False, 'error': str(exc)})

    def do_POST(self):
        if self.path != '/sync' or not self._authorized():
            return self._reply({'ok': False}, 403)
        try:
            size = int(self.headers.get('Content-Length', '0'))
            body = json.loads(self.rfile.read(size) or b'{}')
            leb2_user_id = body.get('leb2UserId')
            if not is_allowed_leb2_user(leb2_user_id):
                return self._reply({
                    'ok': False,
                    'error': authorization_error_message()
                }, 403)
            self._reply({'ok': True, **sync(body.get('items', []))})
        except Exception as exc:
            self._reply({'ok': False, 'error': str(exc)}, 500)


def main():
    server = ThreadingHTTPServer(('127.0.0.1', PORT), Handler)
    server.serve_forever()


if __name__ == '__main__':
    main()
