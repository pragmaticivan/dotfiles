import unittest

from leads.dedupe import dedupe


class DedupeTest(unittest.TestCase):
    def test_merges_same_email_case_insensitive(self):
        leads = [
            {"email": "Pat@Example.com", "zip": "02110"},
            {"email": "pat@example.com ", "phone": "617-555-0100"},
        ]
        self.assertEqual(dedupe(leads), [{"email": "Pat@Example.com", "zip": "02110", "phone": "617-555-0100"}])

    def test_keeps_leads_without_contact_info(self):
        leads = [{"zip": "02110"}, {"zip": "10001"}]
        self.assertEqual(len(dedupe(leads)), 2)


if __name__ == "__main__":
    unittest.main()
