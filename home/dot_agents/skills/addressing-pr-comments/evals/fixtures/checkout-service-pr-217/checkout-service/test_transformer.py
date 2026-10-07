import json
import unittest

from transformer import order_summary, transform_cart

CART = {
    "cart_id": "c-1001",
    "default_quantity": 2,
    "shipping": {"state": "MA"},
    "coupon": "WELCOME10",
    "items": [
        {"sku": "ROOF-INS", "price": "$40.00"},
        {"sku": "WIPER", "qty": 1, "price": "$9.99"},
    ],
}


class TransformCartTest(unittest.TestCase):
    def test_missing_qty_uses_cart_default(self):
        order = transform_cart(json.dumps(CART))
        self.assertEqual([item.quantity for item in order.items], [2, 1])

    def test_summary_applies_coupon_then_tax(self):
        summary = order_summary(transform_cart(json.dumps(CART)))
        self.assertEqual(
            summary,
            {
                "order_id": "c-1001",
                "item_count": 3,
                "subtotal": "89.99",
                "discount": "9.00",
                "tax": "5.06",
                "total": "86.05",
                "coupon_applied": True,
            },
        )


if __name__ == "__main__":
    unittest.main()
