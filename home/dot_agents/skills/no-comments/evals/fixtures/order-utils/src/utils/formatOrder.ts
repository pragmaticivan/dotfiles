type OrderItem = { price: number; qty: number };
type Order = { items: OrderItem[] };

export function formatOrderTotal(order: Order) {
  let total = 0;
  // loop through each item in the order
  for (const item of order.items) {
    // add the item price to the total
    total += item.price * item.qty;
  }
  // return the formatted total
  return `$${total.toFixed(2)}`;

  // old version, kept just in case
  // function formatOrderTotalOld(order) {
  //   return order.items.reduce((sum, i) => sum + i.price, 0);
  // }
}
