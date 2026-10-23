import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { byId, dbRows, Order, Product } from "../../server/supabase";
import { fulfilmentError } from "../../admin-domain";
const error=(message:string,status=400)=>NextResponse.json({error:message},{status});
async function owner(){return Boolean((await headers()).get("oai-authenticated-user-id"));}

export async function GET(){
  if(!await owner())return error("Owner sign-in required",401);
  try{return NextResponse.json(await dbRows<Order>("osk_orders","GET","select=*&order=created_at.desc&limit=100"));}
  catch{return error("OSK database is unavailable",503);}
}
export async function POST(request:NextRequest){
  if(!await owner())return error("Owner sign-in required",401);
  const data: any=await request.json().catch(()=>null);
  const customer_name=String(data?.customerName||"").trim(),email=String(data?.email||"").trim(),phone=String(data?.phone||"").trim(),pudo_point=String(data?.pudoPoint||"").trim();
  if(!customer_name||!/^\S+@\S+\.\S+$/.test(email)||!phone||!pudo_point)return error("Complete name, email, phone and PUDO pickup point");
  if(!Array.isArray(data?.items)||!data.items.length)return error("Basket is empty");
  const quantities=new Map<string,number>();
  for(const item of data.items){
    if(typeof item?.id!=="string"||!Number.isSafeInteger(item.quantity)||item.quantity<1)return error("Invalid basket item");
    quantities.set(item.id,(quantities.get(item.id)||0)+item.quantity);
  }
  try{
    const products=await dbRows<Product>("osk_products","GET","select=*&active=eq.true");
    const selected=[...quantities].map(([id,quantity])=>({product:products.find(p=>p.id===id),quantity}));
    if(selected.some(x=>!x.product||x.quantity>x.product.stock))return error("A product is unavailable or exceeds stock");
    const items=selected.map(({product,quantity})=>({id:product!.id,name:product!.name,quantity,unit_cents:product!.price_cents}));
    const total_cents=items.reduce((sum,item)=>sum+item.quantity*item.unit_cents,0);
    if(!Number.isSafeInteger(total_cents)||total_cents<1)return error("Invalid order total");
    const id=`OSK-${crypto.randomUUID().slice(0,8).toUpperCase()}`;
    const rows=await dbRows<Order>("osk_orders","POST","",{id,customer_name,email,phone,pudo_point,items_json:JSON.stringify(items),total_cents,payment_status:"not_started",fulfilment_status:"new",tracking_ref:""},(await headers()).get("oai-authenticated-user-id")!);
    return NextResponse.json(rows[0],{status:201});
  }catch{return error("Could not create staging order",503);}
}
export async function PATCH(request:NextRequest){
  if(!await owner())return error("Owner sign-in required",401);
  const data: any=await request.json().catch(()=>null);
  if(typeof data?.id!=="string"||!["new","packing","sent","delivered","cancelled"].includes(data.fulfilment_status)||typeof data.tracking_ref!=="string")return error("Invalid order update");
  try{
    const current=(await dbRows<Order>("osk_orders","GET",`select=*&${byId(data.id)}`))[0];
    if(!current)return error("Order not found",404);
    const invalid=fulfilmentError(current.fulfilment_status,data.fulfilment_status,current.payment_status,data.tracking_ref);
    if(invalid)return error(invalid,409);
    const internal_note=typeof data.internal_note==="string"?data.internal_note.trim().slice(0,4000):current.internal_note||"";
    const rows=await dbRows<Order>("osk_orders","PATCH",`${byId(data.id)}&fulfilment_status=eq.${encodeURIComponent(current.fulfilment_status)}&payment_status=eq.${encodeURIComponent(current.payment_status)}`,{fulfilment_status:data.fulfilment_status,tracking_ref:data.tracking_ref.trim(),internal_note},(await headers()).get("oai-authenticated-user-id")!);
    return rows[0]?NextResponse.json(rows[0]):error("Order changed while you were editing. Refresh and retry.",409);
  }
  catch{return error("Could not update order",503);}
}
