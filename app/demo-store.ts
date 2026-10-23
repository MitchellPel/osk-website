import type { Product, Order, Activity, Movement } from "./server/supabase";
import { partnerPreview } from "./preview-navigation";
import { stockError, fulfilmentError } from "./admin-domain";

const key="osk-local-demo-v1";
type DemoStore={products:Product[];orders:Order[];activity?:Activity[];movements?:Movement[]};
export function isLocalDemo(){return typeof window!=="undefined"&&(partnerPreview||["localhost","127.0.0.1","[::1]"].includes(window.location.hostname));}
function seed():DemoStore{
  const base={description:"Demonstration product only. Sample price and stock; actual dimensions, material and bike compatibility have not been confirmed.",stock:10,fitment:"Unverified — demo only",bike_model:"KTM 300 EXC",year_from:null,year_to:null,control_assembly:"Not confirmed",fitment_verified:false,active:true};
  const products:Product[]=[
    {...base,id:"demo-brake",name:"Demo emergency brake lever",kind:"brake",price_cents:15000},
    {...base,id:"demo-clutch",name:"Demo emergency clutch lever",kind:"clutch",price_cents:15000},
    {...base,id:"demo-bundle",name:"Demo brake + clutch kit",kind:"kit",price_cents:27500},
  ];
  return {products,orders:[{id:"DEMO-ORDER-001",customer_name:"Demo Rider",email:"rider@example.invalid",phone:"Demo phone",pudo_point:"Example PUDO point — not a real booking",items_json:JSON.stringify([{id:"demo-bundle",name:products[2].name,quantity:1,unit_cents:27500}]),total_cents:27500,payment_status:"not_started",fulfilment_status:"new",tracking_ref:"",yoco_checkout_id:null,created_at:new Date().toISOString()}]};
}
function read():DemoStore{
  const saved=localStorage.getItem(key);
  if(saved){const data=JSON.parse(saved) as DemoStore;data.activity??=[];data.movements??=[];data.products=data.products.map((p,i)=>({sku:`OSK-DEMO-${String(i+1).padStart(3,"0")}`,reorder_point:5,archived:false,...p}));return data;}
  const initial=seed();initial.activity=[];initial.movements=[];initial.products=initial.products.map((p,i)=>({...p,sku:`OSK-DEMO-${String(i+1).padStart(3,"0")}`,reorder_point:5,archived:false}));localStorage.setItem(key,JSON.stringify(initial));return initial;
}
function reply(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}});}
function log(store:DemoStore,entity_type:string,entity_id:string,action:string,details:Record<string,unknown>={}){
  store.activity??=[];store.activity.unshift({id:crypto.randomUUID(),entity_type,entity_id,action,details,actor:"Local owner (demo)",created_at:new Date().toISOString()});
}

// Explicit static presentation builds use dummy browser data; other hosted builds call the server.
export async function storeRequest(url:string,options?:RequestInit):Promise<Response>{
  if(!isLocalDemo())return fetch(url,options);
  try{
    const store=read(),method=options?.method||"GET";
    const data=options?.body?JSON.parse(String(options.body)):{};
    if(url==="/api/products"){
      if(method==="GET")return reply(store.products);
      if(method==="POST"){
        const product={id:crypto.randomUUID(),name:data.name,kind:data.kind,description:"Demo draft",price_cents:0,stock:0,fitment:"Unverified — demo only",bike_model:"KTM 300 EXC",year_from:null,year_to:null,control_assembly:"",fitment_verified:false,active:false,sku:`OSK-${crypto.randomUUID().slice(0,6).toUpperCase()}`,reorder_point:5,archived:false};
        store.products.push(product);log(store,"product",product.id,"created",{name:product.name});
        localStorage.setItem(key,JSON.stringify(store));return reply(product,201);
      }else if(method==="PATCH"){
        if(!String(data.name||"").trim()||!Number.isSafeInteger(data.stock)||data.stock<0||!Number.isSafeInteger(data.price_cents)||data.price_cents<0)return reply({error:"Enter a name, valid price and whole stock quantity."},400);
        if([data.year_from,data.year_to].some(y=>y!==null&&(!Number.isInteger(y)||y<1990||y>2100))||(data.year_from!==null&&data.year_to!==null&&data.year_from>data.year_to))return reply({error:"Check the year range."},400);
        const i=store.products.findIndex(p=>p.id===data.id);if(i<0)return reply({error:"Product not found"},404);
        if(data.stock!==store.products[i].stock)return reply({error:"Use Inventory to adjust stock with a reason."},409);
        if(!Number.isSafeInteger(data.reorder_point??5)||(data.reorder_point??5)<0)return reply({error:"Check low stock threshold."},400);
        if(data.sku&&store.products.some(p=>p.id!==data.id&&p.sku===String(data.sku).toUpperCase()))return reply({error:"SKU already exists."},409);
        const changed_fields=Object.keys(data).filter(k=>JSON.stringify(data[k])!==JSON.stringify((store.products[i] as any)[k]));
        store.products[i]={...store.products[i],...data,sku:String(data.sku||"").toUpperCase(),active:data.archived?false:data.active};
        if(changed_fields.length)log(store,"product",data.id,data.archived?"archived":"updated",{name:data.name,changed_fields});
      }
    }else if(url==="/api/orders"){
      if(method==="GET")return reply(store.orders);
      if(method==="POST"){
        if(!data.customerName||!/^\S+@\S+\.\S+$/.test(data.email)||!data.phone||!data.pudoPoint)return reply({error:"Complete the order details."},400);
        if(!Array.isArray(data.items)||!data.items.length)return reply({error:"Your basket is empty."},400);
        const items=[];
        for(const line of data.items){
          const p=store.products.find(p=>p.id===line.id&&p.active);
          if(!p||!Number.isSafeInteger(line.quantity)||line.quantity<1||line.quantity>p.stock)return reply({error:"Check product availability and quantities."},400);
          items.push({id:p.id,name:p.name,quantity:line.quantity,unit_cents:p.price_cents});
        }
        const order:Order={id:`DEMO-${crypto.randomUUID().slice(0,8).toUpperCase()}`,customer_name:data.customerName,email:data.email,phone:data.phone,pudo_point:data.pudoPoint,items_json:JSON.stringify(items),total_cents:items.reduce((s,i)=>s+i.unit_cents*i.quantity,0),payment_status:"not_started",fulfilment_status:"new",tracking_ref:"",yoco_checkout_id:null,created_at:new Date().toISOString()};
        store.orders.unshift(order);log(store,"order",order.id,"created");localStorage.setItem(key,JSON.stringify(store));return reply(order,201);
      }else if(method==="PATCH"){
        const order=store.orders.find(o=>o.id===data.id);if(!order)return reply({error:"Order not found"},404);
        const error=fulfilmentError(order.fulfilment_status,data.fulfilment_status,order.payment_status,String(data.tracking_ref||""));
        if(error)return reply({error},409);
        log(store,"order",order.id,"updated",{from:order.fulfilment_status,to:data.fulfilment_status});
        order.fulfilment_status=data.fulfilment_status;order.tracking_ref=String(data.tracking_ref||"");order.internal_note=String(data.internal_note||"").slice(0,4000);
      }
    }else if(url==="/api/checkout-test"){
      const order=store.orders.find(o=>o.id===data.orderId);if(!order)return reply({error:"Order not found"},404);
      order.payment_status="demo_simulated";order.yoco_checkout_id="demo-only";
      log(store,"order",order.id,"payment simulated");
      localStorage.setItem(key,JSON.stringify(store));return reply({simulated:true});
    }else if(url==="/api/admin/activity"){
      return reply({activity:store.activity||[],movements:store.movements||[]});
    }else if(url==="/api/admin/inventory"&&method==="POST"){
      const product=store.products.find(p=>p.id===data.product_id);if(!product)return reply({error:"Product not found"},404);
      const error=stockError(product.stock,data.delta,data.expected,String(data.reason||""));if(error)return reply({error},409);
      store.movements??=[];store.movements.unshift({id:crypto.randomUUID(),product_id:product.id,delta:data.delta,stock_before:product.stock,stock_after:product.stock+data.delta,reason:data.reason.trim(),actor:"Local owner (demo)",created_at:new Date().toISOString()});
      product.stock+=data.delta;log(store,"inventory",product.id,"stock adjusted",{name:product.name,delta:data.delta,reason:data.reason.trim()});
      localStorage.setItem(key,JSON.stringify(store));return reply(product);
    }else return reply({error:"Unknown demo action"},404);
    localStorage.setItem(key,JSON.stringify(store));return reply({ok:true});
  }catch{return reply({error:"Could not save demo data in this browser."},500);}
}
