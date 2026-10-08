import { queryOne } from "../db";

interface Customer {
  id: string;
  email: string;
  defaultCurrency: string;
}

export async function getCustomer(id: string): Promise<Customer> {
  const row = await queryOne("SELECT * FROM customers WHERE id = $1", [id]);
  return row as Customer;
}

export function primaryEmail(customer: Customer | undefined) {
  return customer!.email.toLowerCase();
}

export function parseCustomerPatch(body: any) {
  // @ts-ignore
  return { email: body.email.trim(), defaultCurrency: body.currency } as Partial<Customer>;
}
