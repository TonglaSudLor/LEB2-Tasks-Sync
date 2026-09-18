# Google OAuth Setup

Every user currently creates a personal Google Cloud OAuth client. This keeps Google credentials under the user's control and avoids distributing the maintainer's client secret.

## 1. Create or select a Google Cloud project

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project, for example **LEB2 Tasks Sync**, or select an existing project.

## 2. Enable Google Tasks API

1. Open **APIs & Services → Library**.
2. Search for **Google Tasks API**.
3. Click **Enable**.

## 3. Configure Google Auth Platform

1. Open **Google Auth Platform**.
2. Complete **Branding** with an app name and support email.
3. Under **Audience**, choose **External** unless your account belongs to a suitable Google Workspace organization.
4. Keep the app in **Testing** for personal use.
5. Add your own Google address under **Test users**.
6. Under **Data Access**, add only:

   ```text
   https://www.googleapis.com/auth/tasks
   ```

## 4. Create a Desktop OAuth client

1. Open **APIs & Services → Credentials**.
2. Choose **Create credentials → OAuth client ID**.
3. Select **Desktop app**.
4. Give it a name such as `LEB2 Tasks Sync Local Companion`.
5. Download the JSON file.
6. Rename it to `google_client_secret.json`.
7. Place it in the project root beside `setup.py`.

Expected layout:

```text
LEB2-Tasks-Sync/
├── google_client_secret.json   # private; never commit
├── setup.py
├── oauth_listener.py
└── companion.py
```

## 5. Authorize

Run:

```bash
python oauth_listener.py
```

Select the same Google account you added as a test user, approve Google Tasks access, and wait for **Google Tasks connected**.

The authorization creates `google_token.json`. It contains a refresh token and must remain private.

## Testing-mode note

Google may require periodic reauthorization while the OAuth app remains in Testing. If sync later reports that Google is disconnected, run `python oauth_listener.py` again.

## Never publish

```text
google_client_secret.json
google_token.json
.oauth_pending.json
```
