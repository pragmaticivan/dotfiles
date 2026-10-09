from leads import export, filters


def list_leads(store, params):
    return filters.by_status(store.all(), params.get("status"))


def export_leads(store, params):
    return export.export_csv(list_leads(store, params))
