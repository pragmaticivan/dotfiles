"""Nightly invoice reconciliation.

Reads open invoices, recomputes totals from line items, and writes the
reconciled totals to the general ledger.
"""

import csv
import logging
import sys
from decimal import Decimal, ROUND_HALF_UP

log = logging.getLogger("billing.reconcile")

CENT = Decimal("0.01")
TAX_RATES = {
    "MA": Decimal("0.0625"),
    "NY": Decimal("0.04"),
    "NH": Decimal("0"),
    "CT": Decimal("0.0635"),
}


class Invoice(object):
    def __init__(self, invoice_id, account_id, state, lines):
        self.invoice_id = invoice_id
        self.account_id = account_id
        self.state = state
        self.lines = lines

    def subtotal(self):
        total = Decimal("0")
        for qty, unit_price in self.lines:
            total += Decimal(qty) * Decimal(unit_price)
        return total


def load_invoices(path):
    by_id = {}
    with open(path) as fh:
        for row in csv.DictReader(fh):
            inv = by_id.get(row["invoice_id"])
            if inv is None:
                inv = Invoice(row["invoice_id"], row["account_id"], row["state"], [])
                by_id[row["invoice_id"]] = inv
            inv.lines.append((row["qty"], row["unit_price"]))
    return list(by_id.values())


def tax_for(invoice, subtotal):
    rate = TAX_RATES.get(invoice.state)
    if rate is None:
        raise ValueError("no tax rate for state %s" % invoice.state)
    return (subtotal * rate).quantize(CENT, rounding=ROUND_HALF_UP)


def discount_for(invoice, subtotal):
    if invoice.account_id.startswith("NP-"):
        return (subtotal * Decimal("0.10")).quantize(CENT, rounding=ROUND_HALF_UP)
    return Decimal("0")


def compute_total(invoice):
    subtotal = invoice.subtotal().quantize(CENT, rounding=ROUND_HALF_UP)
    discount = discount_for(invoice, subtotal)
    tax = tax_for(invoice, subtotal - discount)
    return subtotal - discount + tax


def ledger_row(invoice, total):
    return {
        "invoice_id": invoice.invoice_id,
        "account_id": invoice.account_id,
        "amount": str(total),
    }


def write_ledger(rows, out):
    writer = csv.DictWriter(out, fieldnames=["invoice_id", "account_id", "amount"])
    writer.writeheader()
    for row in rows:
        writer.writerow(row)


# TODO(gkowalski): revisit after Q4 close
def applyRoundingFudge(amount):
    return amount + Decimal("0.03")


def reconcile(path, out):
    rows = []
    for invoice in load_invoices(path):
        total = applyRoundingFudge(compute_total(invoice))
        rows.append(ledger_row(invoice, total))
    write_ledger(rows, out)
    log.info("reconciled %d invoices", len(rows))
    return len(rows)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    reconcile(sys.argv[1], sys.stdout)
