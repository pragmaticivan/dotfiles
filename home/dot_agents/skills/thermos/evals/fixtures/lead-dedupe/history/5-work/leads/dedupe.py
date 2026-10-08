import re


def normalize_email(email):
    if not email:
        return None
    return email.strip().lower()


def normalize_phone(phone):
    digits = re.sub(r"\D", "", phone or "")
    if len(digits) == 11 and digits.startswith("1"):
        digits = digits[1:]
    return digits


def lead_key(lead):
    return normalize_email(lead.get("email")) or f"phone:{normalize_phone(lead.get('phone'))}"


def merge(primary, duplicate):
    for field, value in duplicate.items():
        if value and not primary.get(field):
            primary[field] = value


def dedupe(leads):
    seen = {}
    unique = []
    for lead in leads:
        key = lead_key(lead)
        if key in seen:
            merge(seen[key], lead)
            continue
        seen[key] = lead
        unique.append(lead)
    return unique
