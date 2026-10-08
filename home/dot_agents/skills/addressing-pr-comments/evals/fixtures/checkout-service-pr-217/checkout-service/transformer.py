"""Turn raw cart events from the storefront into checkout orders."""

import json
from dataclasses import dataclass, field
from decimal import ROUND_HALF_UP, Decimal

CENTS = Decimal("0.01")

TAX_RATES = {
    "MA": Decimal("0.0625"),
    "NY": Decimal("0.04"),
    "TX": Decimal("0.0625"),
}

COUPONS = {
    "WELCOME10": Decimal("0.10"),
    "BUNDLE15": Decimal("0.15"),
}


@dataclass
class LineItem:
    sku: str
    quantity: int
    unit_price: Decimal

    @property
    def total(self):
        return (self.unit_price * self.quantity).quantize(CENTS, ROUND_HALF_UP)


@dataclass
class Order:
    order_id: str
    state: str
    items: list = field(default_factory=list)
    coupon: str | None = None

    @property
    def subtotal(self):
        return sum((item.total for item in self.items), Decimal("0"))

    @property
    def discount(self):
        rate = COUPONS.get(self.coupon or "", Decimal("0"))
        return (self.subtotal * rate).quantize(CENTS, ROUND_HALF_UP)

    @property
    def tax(self):
        rate = TAX_RATES.get(self.state, Decimal("0"))
        return ((self.subtotal - self.discount) * rate).quantize(CENTS, ROUND_HALF_UP)

    @property
    def total(self):
        return self.subtotal - self.discount + self.tax


def parse_price(value):
    """Parse a price string such as "$12.50" into a Decimal rounded to the nearst cent."""
    return Decimal(str(value).lstrip("$")).quantize(CENTS, ROUND_HALF_UP)


def transform_cart(raw):
    data = json.loads(raw)

    def to_item(payload):
        return LineItem(
            sku=payload["sku"],
            quantity=payload.get("qty", data.get("default_quantity", 1)),
            unit_price=parse_price(payload["price"]),
        )

    return Order(
        order_id=data["cart_id"],
        state=data["shipping"]["state"],
        items=[to_item(entry) for entry in data["items"]],
        coupon=data.get("coupon"),
    )


def order_summary(order):
    return {
        "order_id": order.order_id,
        "item_count": sum(item.quantity for item in order.items),
        "subtotal": str(order.subtotal),
        "discount": str(order.discount),
        "tax": str(order.tax),
        "total": str(order.total),
        "coupon_applied": order.coupon in COUPONS,
    }
