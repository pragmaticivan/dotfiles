import unittest

from leads.dedupe import dedupe


class DedupeTest(unittest.TestCase):
    def test_merges_same_email_case_insensitive(self):
        leads = [
            {"email": "Pat@Example.com", "zip": "02110"},
            {"email": "pat@example.com ", "phone": "617-555-0100"},
        ]
        self.assertEqual(dedupe(leads), [{"email": "Pat@Example.com", "zip": "02110", "phone": "617-555-0100"}])

    def test_merges_same_phone_when_email_missing(self):
        leads = [
            {"phone": "(617) 555-0100", "zip": "02110"},
            {"phone": "+1 617 555 0100", "first_name": "Pat"},
        ]
        self.assertEqual(dedupe(leads), [{"phone": "(617) 555-0100", "zip": "02110", "first_name": "Pat"}])


if __name__ == "__main__":
    unittest.main()
