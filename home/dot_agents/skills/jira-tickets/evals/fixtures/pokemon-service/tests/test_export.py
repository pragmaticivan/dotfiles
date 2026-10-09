import unittest

from pokedex.export import export_csv


def mon(i):
    return {"id": i, "name": f"mon{i}", "type": "grass", "generation": 1}


class ExportTest(unittest.TestCase):
    def test_header_and_rows(self):
        lines = export_csv([mon(1), mon(2)]).strip().splitlines()
        self.assertEqual(lines[0], "id,name,type,generation")
        self.assertEqual(len(lines), 3)


if __name__ == "__main__":
    unittest.main()
