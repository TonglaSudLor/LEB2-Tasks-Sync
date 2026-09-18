# Contributing

Thanks for improving LEB2 Tasks Sync.

## Before starting

- Search existing issues.
- Keep changes focused.
- Never use or submit another person's LEB2 records.
- Do not commit credentials or generated local config.

## Development setup

1. Fork and clone the repository.
2. Create a branch:

   ```bash
   git switch -c fix/short-description
   ```

3. For live testing, create your own Google Desktop OAuth client and run `python setup.py`.
4. Keep all private files ignored.

## Required checks

```bash
node tests/lib.test.js
python -m unittest tests.test_companion -v
node --check extension/background.js
node --check extension/lib.js
node --check extension/popup.js
python -m py_compile companion.py oauth_setup.py oauth_listener.py setup.py
python scripts/secret_scan.py
```

## Pull requests

Describe:

- the problem;
- the behavior before and after;
- tests added or changed;
- browsers tested;
- whether LEB2 selectors/endpoints changed.

Use synthetic or redacted examples. Screenshots must not reveal student names, IDs, class membership, grades, submissions, OAuth details, or browser cookies.

## Coding guidelines

- Keep LEB2 extraction inside the authenticated page context.
- Return only fields required for Tasks.
- Put pure transformation logic in `extension/lib.js` and test it.
- Preserve stable activity markers to prevent duplicates.
- Request the narrowest practical browser permissions and Google scopes.
- Treat OAuth consent and institutional sign-in as user-only actions.

## Documentation

Update README or relevant docs whenever setup, permissions, data handling, or user-visible behavior changes.
