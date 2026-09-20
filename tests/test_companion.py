import unittest

import companion


class CompanionTaskTests(unittest.TestCase):
    def test_completed_task_is_not_reopened_by_leb2(self):
        existing = {'status': 'completed', 'completed': '2026-09-01T00:00:00.000Z'}
        incoming = {'title': 'Homework', 'status': 'needsAction'}
        merged = companion.preserve_manual_completion(existing, incoming)
        self.assertNotIn('status', merged)

    def test_unfinished_task_keeps_incoming_status(self):
        existing = {'status': 'needsAction'}
        incoming = {'title': 'Homework', 'status': 'needsAction'}
        merged = companion.preserve_manual_completion(existing, incoming)
        self.assertEqual(merged['status'], 'needsAction')

    def test_identical_task_does_not_need_update(self):
        existing = {'title': 'Homework', 'notes': 'N', 'due': '2026-09-08T00:00:00.000Z', 'status': 'needsAction'}
        self.assertFalse(companion.task_changed(existing, dict(existing)))

    def test_changed_due_date_needs_update(self):
        existing = {'title': 'Homework', 'notes': 'N', 'due': '2026-09-08T00:00:00.000Z', 'status': 'needsAction'}
        incoming = {**existing, 'due': '2026-09-09T00:00:00.000Z'}
        self.assertTrue(companion.task_changed(existing, incoming))

    def test_any_unblocked_leb2_user_is_accepted(self):
        self.assertTrue(companion.is_allowed_leb2_user('67340500018', []))

    def test_blank_user_id_is_rejected(self):
        self.assertFalse(companion.is_allowed_leb2_user('', []))

    def test_blocked_user_is_rejected(self):
        self.assertFalse(
            companion.is_allowed_leb2_user(
                'blocked-example',
                ['blocked-example'],
            )
        )

    def test_access_failure_uses_generic_sync_error(self):
        message = companion.authorization_error_message()
        self.assertEqual(message, 'Unable to complete sync. Error code: E_SYNC_403.')
        self.assertNotIn('blocked', message.lower())
        self.assertNotIn('authorized', message.lower())

    def test_expired_google_token_has_actionable_message(self):
        message = companion.google_refresh_error('invalid_grant', 'Token has been expired or revoked.')
        self.assertIn('expired', message)
        self.assertIn('revoked', message)
        self.assertIn('python oauth_listener.py', message)


if __name__ == '__main__':
    unittest.main()
