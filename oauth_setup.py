#!/usr/bin/env python3
import base64
import hashlib
import json
import secrets
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CLIENT_FILE = ROOT / 'google_client_secret.json'
PENDING_FILE = ROOT / '.oauth_pending.json'
TOKEN_FILE = ROOT / 'google_token.json'
SCOPE = 'https://www.googleapis.com/auth/tasks'
REDIRECT_URI = 'http://localhost:1'


def load_client():
    data = json.loads(CLIENT_FILE.read_text(encoding='utf-8'))['installed']
    return data['client_id'], data['client_secret']


def auth_url():
    client_id, _ = load_client()
    verifier = base64.urlsafe_b64encode(secrets.token_bytes(48)).decode().rstrip('=')
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip('=')
    state = secrets.token_urlsafe(24)
    PENDING_FILE.write_text(json.dumps({'verifier': verifier, 'state': state}), encoding='utf-8')
    params = {
        'response_type': 'code',
        'client_id': client_id,
        'redirect_uri': REDIRECT_URI,
        'scope': SCOPE,
        'state': state,
        'code_challenge': challenge,
        'code_challenge_method': 'S256',
        'access_type': 'offline',
        'prompt': 'consent'
    }
    print('https://accounts.google.com/o/oauth2/auth?' + urllib.parse.urlencode(params))


def exchange(value):
    pending = json.loads(PENDING_FILE.read_text(encoding='utf-8'))
    if value.startswith('http'):
        query = urllib.parse.parse_qs(urllib.parse.urlparse(value).query)
        code = query.get('code', [''])[0]
        state = query.get('state', [''])[0]
    else:
        code, state = value, pending['state']
    if not code:
        raise SystemExit('No authorization code found.')
    if state != pending['state']:
        raise SystemExit('OAuth state mismatch.')
    client_id, client_secret = load_client()
    body = urllib.parse.urlencode({
        'code': code,
        'client_id': client_id,
        'client_secret': client_secret,
        'redirect_uri': REDIRECT_URI,
        'grant_type': 'authorization_code',
        'code_verifier': pending['verifier']
    }).encode()
    req = urllib.request.Request('https://oauth2.googleapis.com/token', data=body, headers={'Content-Type': 'application/x-www-form-urlencoded'})
    with urllib.request.urlopen(req, timeout=30) as response:
        token = json.load(response)
    token['obtained_at'] = __import__('time').time()
    TOKEN_FILE.write_text(json.dumps(token, indent=2), encoding='utf-8')
    PENDING_FILE.unlink(missing_ok=True)
    print('AUTHORIZED')


if __name__ == '__main__':
    if len(sys.argv) == 1 or sys.argv[1] == '--auth-url':
        auth_url()
    elif sys.argv[1] == '--auth-code' and len(sys.argv) > 2:
        exchange(sys.argv[2])
    else:
        raise SystemExit('Usage: oauth_setup.py --auth-url | --auth-code REDIRECTED_URL')
