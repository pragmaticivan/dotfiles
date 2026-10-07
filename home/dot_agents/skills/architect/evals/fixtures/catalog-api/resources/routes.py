from resources.categories import CategoryHandlers, CategoryRepository

ROUTES = {
    "categories": CategoryHandlers(CategoryRepository()),
}
