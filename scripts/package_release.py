#!/usr/bin/env python3
"""Build a deterministic public-safe source archive."""

import json
import shutil
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
VERSION = json.loads((ROOT / 'extension' / 'manifest.json').read_text(encoding='utf-8'))['version']
OUT = DIST / f'LEB2-Tasks-Sync-v{VERSION}.zip'

INCLUDE = [
    '.github', 'docs', 'extension', 'scripts', 'tests',
    '.gitignore', 'CHANGELOG.md', 'CONTRIBUTING.md', 'LICENSE',
    'PRIVACY.md', 'README.md', 'SECURITY.md', 'requirements.txt',
    'companion.py', 'oauth_listener.py', 'oauth_setup.py', 'setup.py',
]
EXCLUDE_NAMES = {
    'brave-config.js', 'extension-key.pem', '__pycache__',
    'google_client_secret.json', 'google_token.json', '.oauth_pending.json',
    'companion_config.json', 'allowed_users.json', 'blocked_users.json',
}


def included_files():
    files = []
    for name in INCLUDE:
        path = ROOT / name
        if path.is_file():
            files.append(path)
        elif path.is_dir():
            files.extend(p for p in path.rglob('*') if p.is_file())
    return sorted({p for p in files if not any(part in EXCLUDE_NAMES for part in p.relative_to(ROOT).parts) and p.suffix != '.pyc'})


def main():
    DIST.mkdir(exist_ok=True)
    if OUT.exists():
        OUT.unlink()
    with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as archive:
        for path in included_files():
            archive.write(path, path.relative_to(ROOT).as_posix())
    print(f'Built {OUT} ({OUT.stat().st_size} bytes)')


if __name__ == '__main__':
    main()
