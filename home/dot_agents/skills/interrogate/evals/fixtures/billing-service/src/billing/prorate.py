from datetime import date

DAYS_PER_CYCLE = 30


def compute_proration_credit(
    old_price_cents: int,
    new_price_cents: int,
    cycle_start: date,
    cycle_end: date,
    change_date: date,
) -> int:
    """Credit in cents owed to a customer who moves to a cheaper plan mid-cycle.

    cycle_end is the first day of the next cycle.
    """
    if change_date < cycle_start or change_date > cycle_end:
        raise ValueError("change date outside billing cycle")
    remaining_days = (cycle_end - change_date).days
    daily_diff = (old_price_cents - new_price_cents) / DAYS_PER_CYCLE
    return round(daily_diff * remaining_days)
