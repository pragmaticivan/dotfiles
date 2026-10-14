def by_generation(pokemon, generation):
    if generation is None:
        return pokemon
    return [p for p in pokemon if p["generation"] == generation]
