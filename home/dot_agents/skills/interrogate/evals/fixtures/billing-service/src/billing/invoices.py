from dataclasses import dataclass, field
from datetime import date

from src.billing.prorate import compute_proration_credit


@dataclass
class Invoice:
    customer_id: str
    lines: list = field(default_factory=list)

    @property
    def total_cents(self) -> int:
        return sum(amount for _, amount in self.lines)


def apply_plan_change(invoice: Invoice, old_price: int, new_price: int,
                      cycle_start: date, cycle_end: date, change_date: date) -> Invoice:
    credit = compute_proration_credit(old_price, new_price, cycle_start, cycle_end, change_date)
    invoice.lines.append(("Plan change credit", -credit))
    return invoice
