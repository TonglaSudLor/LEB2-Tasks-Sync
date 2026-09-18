#!/usr/bin/env python3
"""Fail when public source contains private files or credential-like values."""

import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PRIVATE_NAMES = {
    'google_client_secret.json', 'google_token.json', '.oauth_pending.json',
    'companion_config.json', 'brave-config.js', 'allowed_users.json',
    'blocked_users.json', 'extension-key.pem',
}
TEXT_SUFFIXES = {'.py', '.js', '.json', '.md', '.yml', '.yaml', '.txt', '.cmd', '.ps1'}
PATTERNS = {
    'Google client secret': re.compile(r'GOCSPX-[A-Za-z0-9_-]{20,}'),
    'Google refresh token': re.compile(r'1//[A-Za-z0-9_-]{20,}'),
    'private key': re.compile(r'-----BEGIN (?:RSA )?PRIVATE KEY-----'),
    'generated companion secret': re.compile(r"secret:\s*['\"][0-9a-f]{48,}['\"]"),
}


def public_files():
    try:
        output = subprocess.check_output(['git', 'ls-files'], cwd=ROOT, text=True, stderr=subprocess.DEVNULL)
        return [ROOT / line for line in output.splitlines() if line]
    except Exception:
        skipped = {'__pycache__', '.git', 'dist', 'build', '.venv', 'venv'}
        return [p for p in ROOT.rglob('*') if p.is_file() and not any(part in skipped for part in p.parts) and p.name not in PRIVATE_NAMES and p.suffix != '.zip']


def main():
    failures = []
    for path in public_files():
        rel = path.relative_to(ROOT).as_posix()
        if path.name in PRIVATE_NAMES:
            failures.append(f'private file is tracked: {rel}')
            continue
        if path.suffix.lower() not in TEXT_SUFFIXES and path.name not in {'.gitignore', 'LICENSE'}:
            continue
        try:
            text = path.read_text(encoding='utf-8')
        except UnicodeDecodeError:
            continue
        for label, pattern in PATTERNS.items():
            if pattern.search(text):
                failures.append(f'{label} found in {rel}')
    if failures:
        print('SECRET SCAN FAILED')
        for failure in failures:
            print(f'- {failure}')
        raise SystemExit(1)
    print('Secret scan passed.')


if __name__ == '__main__':
    main()
