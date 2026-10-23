import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { dbRows, Product } from "../../../server/supabase";
import { stockError } from "../../../admin-domain";
export async function POST(request:NextRequest){
  const actor=(await headers()).get("oai-authenticated-user-id");
  if(!actor)return NextResponse.json({error:"Owner sign-in required"},{status:401});
  const data:any=await request.json().catch(()=>null);
  if(typeof data?.product_id!=="string"||!Number.isSafeInteger(data.expected)||data.expected<0||typeof data.reason!=="string")return NextResponse.json({error:"Invalid adjustment"},{status:400});
  const error=stockError(data.expected,data.delta,data.expected,data.reason);
  if(error)return NextResponse.json({error},{status:400});
  try{
    const rows=await dbRows<Product>("rpc/osk_adjust_stock","POST","",{p_product_id:data.product_id,p_delta:data.delta,p_expected:data.expected,p_reason:data.reason},actor);
    return NextResponse.json(rows[0]);
  }catch{return NextResponse.json({error:"Stock adjustment failed. Refresh stock and check that the admin database upgrade is connected."},{status:409});}
}
