import unittest

from leads.export import export_csv


def lead(i):
    return {"id": i, "agency_id": 7, "status": "new", "created_at": "2026-09-01"}


class ExportTest(unittest.TestCase):
    def test_header_and_rows(self):
        lines = export_csv([lead(1), lead(2)]).strip().splitlines()
        self.assertEqual(lines[0], "id,agency_id,status,created_at")
        self.assertEqual(len(lines), 3)


if __name__ == "__main__":
    unittest.main()
