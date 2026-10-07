type CheckoutResult = { orderId: string; status: string };

export function bindCheckoutForm(form: HTMLFormElement, onDone: (r: CheckoutResult) => void): void {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector("button[type=submit]") as HTMLButtonElement;
    button.disabled = true;
    const cartId = (form.elements.namedItem("cartId") as HTMLInputElement).value;
    const paymentMethodId = (form.elements.namedItem("paymentMethodId") as HTMLInputElement).value;
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cartId, paymentMethodId }),
    });
    const result = (await res.json()) as CheckoutResult;
    if (res.status === 202) {
      pollOrder(result.orderId, onDone);
    } else {
      button.disabled = false;
      onDone(result);
    }
  });
}

function pollOrder(orderId: string, onDone: (r: CheckoutResult) => void): void {
  const timer = setInterval(async () => {
    const res = await fetch(`/api/orders/${orderId}`);
    const order = (await res.json()) as CheckoutResult;
    if (order.status !== "pending") {
      clearInterval(timer);
      onDone(order);
    }
  }, 2000);
}
