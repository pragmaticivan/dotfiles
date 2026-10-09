def by_status(leads, status):
    if status is None:
        return leads
    return [lead for lead in leads if lead["status"] == status]
