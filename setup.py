#!/usr/bin/env python3
"""Configure the local companion safely for Chrome or Brave on Windows."""

import argparse
import json
import os
import secrets
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CONFIG_FILE = ROOT / 'companion_config.json'
EXTENSION_CONFIG = ROOT / 'extension' / 'brave-config.js'
CLIENT_FILE = ROOT / 'google_client_secret.json'
STARTUP_DIR = Path(os.environ.get('APPDATA', Path.home() / 'AppData/Roaming')) / 'Microsoft/Windows/Start Menu/Programs/Startup'
STARTUP_FILE = STARTUP_DIR / 'LEB2 Tasks Sync Companion.cmd'


def validate_client_file():
    if not CLIENT_FILE.exists():
        raise SystemExit(
            'Missing google_client_secret.json. Download a Desktop OAuth client JSON '
            'from Google Cloud and place it beside setup.py.'
        )
    try:
        installed = json.loads(CLIENT_FILE.read_text(encoding='utf-8'))['installed']
        if not installed.get('client_id') or not installed.get('client_secret'):
            raise KeyError
    except (json.JSONDecodeError, KeyError, TypeError):
        raise SystemExit('google_client_secret.json is not a valid Google Desktop OAuth client file.')


def existing_secret():
    if not CONFIG_FILE.exists():
        return None
    try:
        value = json.loads(CONFIG_FILE.read_text(encoding='utf-8')).get('shared_secret')
        return value if isinstance(value, str) and len(value) >= 32 else None
    except (json.JSONDecodeError, OSError):
        return None


def write_runtime_config(force=False):
    secret = None if force else existing_secret()
    secret = secret or secrets.token_hex(32)
    CONFIG_FILE.write_text(json.dumps({'shared_secret': secret}, indent=2) + '\n', encoding='utf-8')
    EXTENSION_CONFIG.write_text(
        "globalThis.BRAVE_COMPANION = {\n"
        "  enabled: true,\n"
        "  url: 'http://127.0.0.1:8765',\n"
        f"  secret: '{secret}'\n"
        "};\n",
        encoding='utf-8',
    )


def install_startup():
    STARTUP_DIR.mkdir(parents=True, exist_ok=True)
    pythonw = Path(sys.executable).with_name('pythonw.exe')
    executable = pythonw if pythonw.exists() else Path(sys.executable)
    STARTUP_FILE.write_text(
        '@echo off\n'
        f'start "" "{executable}" "{ROOT / "companion.py"}"\n',
        encoding='utf-8',
    )


def main():
    parser = argparse.ArgumentParser(description='Configure LEB2 Tasks Sync.')
    parser.add_argument('--force-new-secret', action='store_true', help='Rotate the localhost shared secret.')
    parser.add_argument('--no-startup', action='store_true', help='Do not create a Windows Startup entry.')
    args = parser.parse_args()

    validate_client_file()
    write_runtime_config(args.force_new_secret)
    if os.name == 'nt' and not args.no_startup:
        install_startup()

    print('SETUP COMPLETE')
    print(f'Extension folder: {ROOT / "extension"}')
    print('Next: run `python oauth_listener.py`, approve Google Tasks, then load the extension folder.')
    if os.name == 'nt' and not args.no_startup:
        print(f'Startup entry: {STARTUP_FILE}')


if __name__ == '__main__':
    main()
