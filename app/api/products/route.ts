import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { byId, dbRows, Product } from "../../server/supabase";

async function owner() { return Boolean((await headers()).get("oai-authenticated-user-id")); }
const error = (message:string,status=400) => NextResponse.json({error:message},{status});

export async function GET() {
  if (!await owner()) return error("Owner sign-in required",401);
  try { return NextResponse.json(await dbRows<Product>("osk_products","GET","select=*&order=kind.asc,name.asc")); }
  catch { return error("OSK database is unavailable",503); }
}

export async function POST(request:NextRequest) {
  if (!await owner()) return error("Owner sign-in required",401);
  const data: any=await request.json().catch(()=>null);
  const name=typeof data?.name==="string"?data.name.trim():"";
  const kind=data?.kind;
  if (!name || !["brake","clutch","kit"].includes(kind)) return error("Enter a name and valid type");
  const draft:Product={id:crypto.randomUUID(),name,kind,description:"",price_cents:0,stock:0,fitment:"",bike_model:"KTM 300 EXC",year_from:null,year_to:null,control_assembly:"",fitment_verified:false,active:false};
  try { const rows=await dbRows<Product>("osk_products","POST","",draft,(await headers()).get("oai-authenticated-user-id")!); return NextResponse.json(rows[0],{status:201}); }
  catch { return error("Could not create product",503); }
}

export async function PATCH(request:NextRequest) {
  if (!await owner()) return error("Owner sign-in required",401);
  const data: any=await request.json().catch(()=>null);
  if (!data || typeof data.id!=="string") return error("Product ID required");
  const name=typeof data.name==="string"?data.name.trim():"";
  const kind=data.kind;
  const price_cents=Number(data.price_cents),stock=Number(data.stock);
  const fitment=typeof data.fitment==="string"?data.fitment.trim():"";
  const bike_model=typeof data.bike_model==="string"?data.bike_model.trim():"";
  const year_from=data.year_from==null?null:Number(data.year_from),year_to=data.year_to==null?null:Number(data.year_to);
  if([year_from,year_to].some(y=>y!==null&&(!Number.isInteger(y)||y<1990||y>2100)))return error("Enter valid years between 1990 and 2100");
  const control_assembly=typeof data.control_assembly==="string"?data.control_assembly.trim():"";
  const description=typeof data.description==="string"?data.description.trim():"";
  const fitment_verified=data.fitment_verified===true,archived=data.archived===true,active=data.active===true&&!archived;
  const sku=typeof data.sku==="string"?data.sku.trim().toUpperCase():"";
  const reorder_point=Number(data.reorder_point??5);
  if(!Number.isSafeInteger(reorder_point)||reorder_point<0||sku.length>64)return error("Check SKU and low stock threshold");
  if (!name || !["brake","clutch","kit"].includes(kind) || !Number.isSafeInteger(price_cents) || price_cents<0 || !Number.isSafeInteger(stock) || stock<0) return error("Check product fields");
  if (active && (!fitment_verified || !fitment || bike_model!=="KTM 300 EXC" || !Number.isSafeInteger(year_from) || !Number.isSafeInteger(year_to) || year_from!>year_to! || !control_assembly || price_cents<1)) return error("Confirm exact KTM model, years, control assembly and price before publishing");
  try {
    const current=(await dbRows<Product>("osk_products","GET",`select=*&${byId(data.id)}`))[0];
    if(!current)return error("Product not found",404);
    if(stock!==current.stock)return error("Use Inventory to adjust stock with a reason.",409);
    const actor=(await headers()).get("oai-authenticated-user-id")!;
    const rows=await dbRows<Product>("osk_products","PATCH",byId(data.id),{name,kind,price_cents,fitment,bike_model,year_from,year_to,control_assembly,description,fitment_verified,active,sku:sku||null,reorder_point,archived},actor);
    return rows[0]?NextResponse.json(rows[0]):error("Product not found",404);
  } catch { return error("Could not save product",503); }
}
