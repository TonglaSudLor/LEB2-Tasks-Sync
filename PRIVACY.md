# Privacy Policy

_Last updated: September 2026_

LEB2 Tasks Sync is an unofficial, open-source local tool. It is not affiliated with KMUTT, LEB2, Google, Chrome, or Brave.

## Data the extension accesses

To perform synchronization, the extension accesses the signed-in user's:

- LEB2 class identifiers and course labels;
- LEB2 assessment titles, dates, and submission state;
- LEB2 teaching-team role for each class;
- Google Tasks through the Google Tasks API.

## Data the project does not request

- It does not ask for or store the user's LEB2 password.
- It does not intentionally export raw LEB2 cookies.
- It does not require access to Gmail, Google Calendar, Google Drive, or Google contacts.
- The public project has no maintainer-operated analytics or telemetry service.

## Where data is processed

LEB2 data is read inside the user's browser session. Normalized Task fields are sent only to a companion bound to `127.0.0.1` on the same computer. The companion sends Task data to Google Tasks using credentials authorized by the user.

## Local files

The user's computer may store:

- `google_client_secret.json` — their Google Desktop OAuth client;
- `google_token.json` — Google OAuth access/refresh token data;
- `companion_config.json` — a random localhost secret;
- `extension/brave-config.js` — matching extension-side local config;
- browser extension storage — sync interval, last result, timestamp, and last error.

These files are excluded from Git and release archives. Users are responsible for protecting their local account and project folder.

## Third parties

- LEB2 processes the user's institutional learning data under KMUTT/LEB2 policies.
- Google processes Google Tasks data and OAuth authorization under Google's policies.
- GitHub hosts public source code and issue content; users must not post private records or credentials in issues.

## Retention and deletion

The maintainer does not receive or retain user data in the current local architecture. Users can delete local credentials by uninstalling the extension and deleting the project folder. Revoking the OAuth app in Google Account settings invalidates its access. Existing Google Tasks remain until the user deletes them.

See `docs/UNINSTALL.md` for complete removal instructions.

## Security reports and questions

Use the private reporting method described in `SECURITY.md`. Do not open a public issue containing student records, tokens, client secrets, cookies, or personally identifying information.
