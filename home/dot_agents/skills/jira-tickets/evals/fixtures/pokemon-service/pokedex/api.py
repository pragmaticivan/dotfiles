from pokedex import export, filters


def list_pokemon(store, params):
    return filters.by_generation(store.all(), params.get("generation"))


def export_pokemon(store, params):
    return export.export_csv(list_pokemon(store, params))
