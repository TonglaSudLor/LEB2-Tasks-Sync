# Troubleshooting

Run the diagnostic first:

```bash
python scripts/doctor.py
```

## LEB2 is not signed in

- Open `https://app.leb2.org/` in the same Chrome/Brave profile.
- Sign in normally.
- Confirm the class list loads.
- Click **Sync now** again.

## No current LEB2 classes were found

LEB2 may have changed its page structure, or the account may have no active classes. Open an issue and include:

- browser and version;
- extension version;
- exact error text;
- whether the LEB2 class page loads.

Do not include cookies, tokens, student IDs, or screenshots containing personal records.

## Local companion is unavailable

Start it manually from the project directory:

```bash
python companion.py
```

If port 8765 is already in use:

```bash
python scripts/doctor.py
```

Close only the old LEB2 companion process, then restart it.

## Google Tasks is not connected

1. Confirm `google_client_secret.json` exists.
2. Run `python oauth_listener.py`.
3. Approve Google Tasks access.
4. Restart `python companion.py`.

## Google OAuth error: access blocked or app not configured

Check that:

- Google Tasks API is enabled;
- OAuth audience is External or appropriate for your organization;
- your Google account is listed as a test user;
- the client type is **Desktop app**;
- the requested scope is Google Tasks.

## Extension cannot be loaded

Run `python setup.py` before loading the extension. The setup creates:

```text
extension/brave-config.js
```

Then reload the unpacked extension from `chrome://extensions` or `brave://extensions`.

## Duplicate Tasks

The sync matches Tasks using a marker in Task notes. Do not remove lines like:

```text
[LEB2_ACTIVITY_ID:12345]
```

If duplicates already exist, keep one marked Task per activity and remove the extras manually.

## Due time is missing

This is expected. Google Tasks stores a due date rather than the exact LEB2 deadline time. Use the LEB2 link in the Task notes for the authoritative time.

## Teaching classes are being synchronized

The extension excludes normalized roles `Teacher`, `Teacher Assistant`, `Teaching Assistant`, and `Assistant`. If LEB2 displays a different role label, open an issue with only that label—do not share member lists.

## Automatic sync is not running

- Confirm the popup shows the desired interval.
- Confirm the extension is enabled.
- Confirm the companion is running.
- On Windows, check that **LEB2 Tasks Sync Companion.cmd** exists in the Startup folder.
- Browser alarm timing can be delayed while the browser is suspended or closed.

## Reset local authorization

1. Stop `companion.py`.
2. Delete `google_token.json`.
3. Run `python oauth_listener.py`.
4. Restart the companion.

Never post the deleted token in an issue or chat.
