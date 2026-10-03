export function addTax(price, rate) {
  return price * (1 + rate);
}

export function mapCustomer(customer) {
  return { id: customer.id, name: customer.name };
}

export function calculatePrice(order) {
  let price = order.price;

  if (order.customer.vip) {
    price *= 0.9;
  }

  if (order.coupon) {
    if (order.coupon.expired) {
      throw new Error("Expired");
    }

    if (order.coupon.type === "percentage") {
      price *= 1 - order.coupon.value;
    } else {
      price -= order.coupon.value;
    }
  }

  if (order.shipping === "express") {
    price += 20;
  }

  if (price < 0) {
    price = 0;
  }

  return price;
}
