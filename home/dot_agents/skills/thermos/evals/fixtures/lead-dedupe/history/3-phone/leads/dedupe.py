import re


def normalize_email(email):
    if not email:
        return None
    return email.strip().lower()


def normalize_phone(phone):
    if not phone:
        return None
    digits = re.sub(r"\D", "", phone)
    if len(digits) == 11 and digits.startswith("1"):
        digits = digits[1:]
    return digits or None


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
            phone = normalize_phone(lead.get("phone"))
            key = f"phone:{phone}" if phone else None
        if key is None:
            unique.append(lead)
            continue
        if key in seen:
            merge(seen[key], lead)
            continue
        seen[key] = lead
        unique.append(lead)
    return unique
