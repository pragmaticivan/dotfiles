import threading

from pokedex import api


def run_nightly_sync(store, write):
    thread = threading.Thread(target=lambda: write(api.export_pokemon(store, {})))
    thread.start()
    return thread
