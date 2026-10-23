import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { byId, dbRows, Order } from "../../server/supabase";
const error=(message:string,status=400)=>NextResponse.json({error:message},{status});
export async function POST(request:NextRequest){
  if(!(await headers()).get("oai-authenticated-user-id"))return error("Owner sign-in required",401);
  const data: any=await request.json().catch(()=>null);
  if(typeof data?.orderId!=="string")return error("Order ID required");
  const key=env.YOCO_TEST_SECRET_KEY;
  if(!key?.startsWith("sk_test_"))return error("Yoco test secret key is not configured",503);
  try{
    const order=(await dbRows<Order>("osk_orders","GET",`select=*&${byId(data.orderId)}`))[0];
    if(!order)return error("Order not found",404);
    if(order.yoco_checkout_id)return error("A test checkout already exists for this order");
    if(order.total_cents<200)return error("Yoco requires an amount of at least R2.00");
    const origin=new URL(request.url).origin;
    const response=await fetch("https://payments.yoco.com/api/checkouts",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json","Idempotency-Key":order.id},body:JSON.stringify({amount:order.total_cents,currency:"ZAR",successUrl:`${origin}/?checkout=returned`,cancelUrl:`${origin}/?checkout=cancelled`,metadata:{orderId:order.id}})});
    if(!response.ok)return error("Yoco test checkout could not be created",502);
    const checkout=await response.json() as {id?:string;redirectUrl?:string;processingMode?:string};
    if(checkout.processingMode!=="test"||!checkout.id||!checkout.redirectUrl)return error("Yoco did not return a valid test checkout",502);
    await dbRows<Order>("osk_orders","PATCH",byId(order.id),{yoco_checkout_id:checkout.id,payment_status:"awaiting_confirmation"});
    return NextResponse.json({redirectUrl:checkout.redirectUrl});
  }catch{return error("Yoco test checkout is unavailable",503);}
}
