from dataclasses import dataclass

from resources.base import NotFound, Response, ValidationError, slugify


@dataclass
class Category:
    id: int
    name: str
    slug: str


class CategoryRepository:
    def __init__(self):
        self._rows: dict[int, Category] = {}
        self._next_id = 1

    def list(self) -> list[Category]:
        return list(self._rows.values())

    def get(self, id: int) -> Category:
        if id not in self._rows:
            raise NotFound(f"category {id}")
        return self._rows[id]

    def create(self, name: str) -> Category:
        slug = slugify(name)
        if any(c.slug == slug for c in self._rows.values()):
            raise ValidationError(f"slug {slug!r} already exists")
        row = Category(id=self._next_id, name=name, slug=slug)
        self._rows[row.id] = row
        self._next_id += 1
        return row

    def update(self, id: int, name: str) -> Category:
        row = self.get(id)
        row.name = name
        row.slug = slugify(name)
        return row

    def delete(self, id: int) -> None:
        self.get(id)
        del self._rows[id]


class CategorySerializer:
    fields = ("id", "name", "slug")

    @classmethod
    def dump(cls, row: Category) -> dict:
        return {f: getattr(row, f) for f in cls.fields}

    @classmethod
    def load(cls, data: dict) -> str:
        name = (data.get("name") or "").strip()
        if not name:
            raise ValidationError("name is required")
        return name


class CategoryHandlers:
    def __init__(self, repo: CategoryRepository):
        self.repo = repo

    def list(self) -> Response:
        return Response(200, [CategorySerializer.dump(r) for r in self.repo.list()])

    def retrieve(self, id: int) -> Response:
        try:
            return Response(200, CategorySerializer.dump(self.repo.get(id)))
        except NotFound as e:
            return Response(404, {"error": str(e)})

    def create(self, data: dict) -> Response:
        try:
            row = self.repo.create(CategorySerializer.load(data))
        except ValidationError as e:
            return Response(400, {"error": str(e)})
        return Response(201, CategorySerializer.dump(row))

    def update(self, id: int, data: dict) -> Response:
        try:
            row = self.repo.update(id, CategorySerializer.load(data))
        except NotFound as e:
            return Response(404, {"error": str(e)})
        except ValidationError as e:
            return Response(400, {"error": str(e)})
        return Response(200, CategorySerializer.dump(row))

    def destroy(self, id: int) -> Response:
        try:
            self.repo.delete(id)
        except NotFound as e:
            return Response(404, {"error": str(e)})
        return Response(204, None)
