import useSWR from "swr";
import type { CustomerOrder } from "@polar-sh/sdk/models/components/customerorder";
import { authClient } from "@/lib/auth-client";

async function fetchOrders(): Promise<CustomerOrder[]> {
  const { data, error } = await authClient.customer.orders.list();
  if (error) return [];
  return data?.result?.items ?? [];
}

export function useOrders() {
  return useSWR("customer-orders", fetchOrders);
}
