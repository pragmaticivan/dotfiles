def normalize_email(email):
    if not email:
        return None
    return email.strip().lower()


def merge(primary, duplicate):
    for field, value in duplicate.items():
        if value and not primary.get(field):
            primary[field] = value


def dedupe(leads):
    seen = {}
    unique = []
    for lead in leads:
        key = normalize_email(lead.get("email"))
        if key is None:
            unique.append(lead)
            continue
        if key in seen:
            merge(seen[key], lead)
            continue
        seen[key] = lead
        unique.append(lead)
    return unique
