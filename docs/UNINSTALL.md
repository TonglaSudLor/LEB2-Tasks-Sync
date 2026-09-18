# Uninstall

## 1. Remove the extension

Open `chrome://extensions` or `brave://extensions`, find **LEB2 Tasks Sync**, and click **Remove**.

## 2. Stop the companion

Close the terminal running `companion.py`, or end only the Python process listening on localhost port `8765`.

## 3. Remove automatic startup

Delete:

```text
%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\LEB2 Tasks Sync Companion.cmd
```

## 4. Revoke Google access

Open your Google Account's third-party access settings and remove access for the OAuth app you created.

## 5. Delete local data

Delete the project folder. The private files stored there include:

```text
google_client_secret.json
google_token.json
companion_config.json
extension/brave-config.js
```

Removing the extension does not delete Google Tasks already created. Delete those Tasks manually if you no longer want them.
