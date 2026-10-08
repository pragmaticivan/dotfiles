import unittest

from resources.categories import CategoryHandlers, CategoryRepository


class CategoryHandlersTest(unittest.TestCase):
    def setUp(self):
        self.h = CategoryHandlers(CategoryRepository())

    def test_create_and_retrieve(self):
        r = self.h.create({"name": "Home & Garden"})
        self.assertEqual((r.status, r.body), (201, {"id": 1, "name": "Home & Garden", "slug": "home-garden"}))
        self.assertEqual(self.h.retrieve(1).body["slug"], "home-garden")

    def test_duplicate_slug_rejected(self):
        self.h.create({"name": "Books"})
        self.assertEqual(self.h.create({"name": "books"}).status, 400)

    def test_missing_name_rejected(self):
        self.assertEqual(self.h.create({}).status, 400)

    def test_update_and_destroy(self):
        self.h.create({"name": "Toys"})
        self.assertEqual(self.h.update(1, {"name": "Games"}).body["slug"], "games")
        self.assertEqual(self.h.destroy(1).status, 204)
        self.assertEqual(self.h.retrieve(1).status, 404)


if __name__ == "__main__":
    unittest.main()
