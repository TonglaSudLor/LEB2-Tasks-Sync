# LEB2 Tasks Sync

Unofficial Chrome/Brave extension that reads assignment deadlines from your signed-in KMUTT LEB2 session and creates matching Google Tasks.

> **Status:** public beta (`0.4.0`). This project uses LEB2's internal website endpoints, not an official public API. It may stop working when LEB2 changes.

## Features

- Syncs LEB2 assessments to Google Tasks.
- Adds the course, title, due date, submission state, and a link back to LEB2.
- Updates existing Tasks instead of creating duplicates.
- Marks Tasks complete when LEB2 reports a submission.
- Preserves Tasks you manually completed.
- Excludes classes where your LEB2 role is Teacher or Teaching Assistant.
- Runs when the browser starts and every 30 minutes by default.
- Supports Chrome and Brave on Windows through one local companion.
- Never asks for or stores your LEB2 password.

## Important limitations

- Google Tasks stores a due **date**, not the exact LEB2 deadline time. Open the LEB2 link in the Task notes to verify the time.
- The browser must remain signed into LEB2.
- The local companion must be running.
- Each user currently creates their own Google Cloud Desktop OAuth client. This avoids sharing the maintainer's credentials, but makes first-time setup longer.
- Deleted LEB2 activities are not automatically deleted from Google Tasks.
- This project is not affiliated with KMUTT, LEB2, Google, Chrome, or Brave.

## Quick start (Windows)

### Requirements

- Python 3.11 or newer
- Google Chrome or Brave
- A Google account
- An active LEB2 account

### 1. Download

Download the latest source ZIP from GitHub Releases and extract it to a permanent folder, or clone the repository:

```bash
git clone https://github.com/TonglaSudLor/LEB2-Tasks-Sync.git
cd LEB2-Tasks-Sync
```

Do not move or delete the folder after setup because the Windows Startup entry points to it.

### 2. Create your Google OAuth client

Follow [Google OAuth Setup](docs/GOOGLE_OAUTH_SETUP.md). Download the Desktop client JSON, rename it to:

```text
google_client_secret.json
```

Place it in the project root beside `setup.py`.

### 3. Configure the app

```bash
python setup.py
```

This command:

- validates your Google client file;
- generates a random localhost secret;
- writes the extension's local config;
- installs a Windows Startup launcher for the companion.

### 4. Connect Google Tasks

```bash
python oauth_listener.py
```

Your browser opens Google's consent page. Select your account and approve Google Tasks access. Wait until the page says **Google Tasks connected**.

### 5. Start the companion

```bash
python companion.py
```

Keep this terminal open for the first test. On future Windows sign-ins, the generated Startup launcher runs it in the background.

### 6. Load the extension

**Brave**

1. Open `brave://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the project's `extension` folder.

**Chrome**

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the project's `extension` folder.

### 7. First sync

1. Sign into [LEB2](https://app.leb2.org/) in the same browser profile.
2. Open **LEB2 Tasks Sync**.
3. Click **Connect Google**; it should report that Google is connected.
4. Click **Sync now**.
5. Open Google Tasks and verify the assignments.

The default interval is 30 minutes. In the popup, `0.5` means 30 minutes.

## Updating

1. Stop the companion.
2. Replace or pull the source files.
3. Run `python setup.py` again (it preserves the existing random secret).
4. Restart `python companion.py`.
5. Open the browser's Extensions page and click **Reload** on LEB2 Tasks Sync.

## Uninstall

See [Uninstall](docs/UNINSTALL.md).

## Troubleshooting

See [Troubleshooting](docs/TROUBLESHOOTING.md). Common checks:

```bash
python scripts/doctor.py
node tests/lib.test.js
python -m unittest tests.test_companion -v
```

## Privacy and security

- [Privacy Policy](PRIVACY.md)
- [Security Policy](SECURITY.md)
- Runtime credentials and tokens are ignored by Git and excluded from release archives.
- Never upload `google_client_secret.json`, `google_token.json`, `companion_config.json`, `extension/brave-config.js`, private `.pem` files, or local policy files.

## Development

```bash
node tests/lib.test.js
python -m unittest tests.test_companion -v
node --check extension/background.js
node --check extension/lib.js
node --check extension/popup.js
python -m py_compile companion.py oauth_setup.py oauth_listener.py setup.py
python scripts/secret_scan.py
python scripts/package_release.py
```

See [Contributing](CONTRIBUTING.md) and [Project Documentation](docs/PROJECT_DOCUMENTATION.md).

## License

MIT — see [LICENSE](LICENSE).
