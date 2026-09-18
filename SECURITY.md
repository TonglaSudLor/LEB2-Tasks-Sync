# Security Policy

## Supported version

Security fixes are applied to the newest release on the default branch. Older source archives are not supported.

## Reporting a vulnerability

Do not open a public issue for vulnerabilities involving credentials, authentication, private student data, or unauthorized access.

Use GitHub's **Report a vulnerability** / private security advisory feature for this repository. Include:

- affected version;
- impact;
- reproduction steps using test data;
- suggested mitigation, if known.

Do not include real LEB2 credentials, cookies, OAuth tokens, client secrets, or another person's student records.

## Sensitive files

Never commit or upload:

```text
google_client_secret.json
google_token.json
.oauth_pending.json
companion_config.json
extension/brave-config.js
allowed_users.json
blocked_users.json
*.pem
```

If one is exposed:

1. Revoke the Google OAuth token from Google Account settings.
2. Delete/rotate the OAuth client in Google Cloud if its secret was exposed.
3. Run `python setup.py --force-new-secret` to rotate the localhost secret.
4. Remove the material from Git history before making the repository public.
5. Assume copied Git history remains compromised even after deleting the latest file.

## Threat model

The current release protects against accidental cross-origin calls to the local companion by binding to loopback, restricting CORS, and requiring a random shared secret. It does not claim to protect against a malicious user or administrator who controls the same computer and source tree.

## Dependency posture

The runtime uses only the Python standard library and browser APIs. This reduces dependency risk but does not remove risks from LEB2, Google APIs, browser behavior, or OAuth configuration.
