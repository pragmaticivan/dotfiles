import threading

from leads import api


def run_nightly_export(store, write):
    thread = threading.Thread(target=lambda: write(api.export_leads(store, {})))
    thread.start()
    return thread
