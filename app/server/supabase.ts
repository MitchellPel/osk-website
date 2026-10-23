import { env } from "cloudflare:workers";

export type Product = { id:string; name:string; kind:string; description:string; price_cents:number; stock:number; fitment:string; bike_model:string; year_from:number|null; year_to:number|null; control_assembly:string; fitment_verified:boolean; active:boolean; sku?:string; reorder_point?:number; archived?:boolean };
export type Order = { id:string; customer_name:string; email:string; phone:string; pudo_point:string; items_json:string; total_cents:number; payment_status:string; fulfilment_status:string; tracking_ref:string; yoco_checkout_id:string|null; created_at:string; internal_note?:string };
export type Activity = {id:string;entity_type:string;entity_id:string;action:string;details:Record<string,unknown>;actor:string;created_at:string};
export type Movement = {id:string;product_id:string;delta:number;stock_before:number;stock_after:number;reason:string;actor:string;created_at:string};

export async function dbRows<T>(table:"osk_products"|"osk_orders"|"osk_activity"|"osk_inventory_movements"|"rpc/osk_adjust_stock", method:"GET"|"POST"|"PATCH", query="", body?:unknown, actor="server"):Promise<T[]> {
  const base = env.SUPABASE_URL;
  const key = env.SUPABASE_SECRET_KEY;
  if (!base?.startsWith("https://") || !key?.startsWith("sb_secret_")) throw new Error("OSK Supabase server connection is not configured");
  const url = new URL(`/rest/v1/${table}${query ? `?${query}` : ""}`,base);
  const response = await fetch(url, {
    method,
    headers: { apikey:key, "Content-Type":"application/json", Prefer:"return=representation", "x-osk-actor":actor },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache:"no-store",
  });
  if (!response.ok) throw new Error(`OSK database request failed (${response.status})`);
  return await response.json() as T[];
}

export const byId = (id:string) => `id=eq.${encodeURIComponent(id)}`;
