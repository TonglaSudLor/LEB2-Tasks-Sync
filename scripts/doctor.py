#!/usr/bin/env python3
"""Run safe local diagnostics without printing credential values."""

import json
import socket
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def check(label, ok, detail=''):
    mark = 'OK' if ok else 'FAIL'
    suffix = f' — {detail}' if detail else ''
    print(f'[{mark}] {label}{suffix}')
    return ok


def valid_json(path):
    try:
        json.loads(path.read_text(encoding='utf-8'))
        return True
    except Exception:
        return False


def main():
    results = []
    results.append(check('Python 3.11+', sys.version_info >= (3, 11), sys.version.split()[0]))

    client = ROOT / 'google_client_secret.json'
    token = ROOT / 'google_token.json'
    config = ROOT / 'companion_config.json'
    ext_config = ROOT / 'extension' / 'brave-config.js'

    results.append(check('Google Desktop client file', client.exists() and valid_json(client)))
    results.append(check('Google token file', token.exists() and valid_json(token)))
    results.append(check('Companion config', config.exists() and valid_json(config)))
    results.append(check('Extension local config', ext_config.exists()))

    listening = False
    try:
        with socket.create_connection(('127.0.0.1', 8765), timeout=1):
            listening = True
    except OSError:
        pass
    results.append(check('Companion listening on 127.0.0.1:8765', listening))

    print('\nNo credential values were displayed.')
    raise SystemExit(0 if all(results) else 1)


if __name__ == '__main__':
    main()
