"use client";
import { useEffect, useMemo, useState } from "react";
import { isLocalDemo, storeRequest } from "./demo-store";

import { adminUrl, logoUrl, partnerPreview } from "./preview-navigation";
import type { Product } from "./server/supabase";
type Order = { id:string; customer_name:string; email:string; phone:string; pudo_point:string; items_json:string; total_cents:number; payment_status:string; fulfilment_status:string; tracking_ref:string; yoco_checkout_id:string|null; created_at:string };
const money = (c:number) => `R${(c/100).toFixed(2)}`;
const jsonHeaders = { "Content-Type":"application/json" };

export default function Home(){
  const [demo,setDemo]=useState(false);
  const [basketReady,setBasketReady]=useState(false);
  const [tab,setTab]=useState<"shop"|"basket">("shop");
  const [products,setProducts]=useState<Product[]>([]);
  const [basket,setBasket]=useState<Record<string,number>>({});
  const [kind,setKind]=useState("all");
  const [bikeYear,setBikeYear]=useState("");
  const [query,setQuery]=useState("");
  const [notice,setNotice]=useState("");
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [placed,setPlaced]=useState("");
  const [details,setDetails]=useState({customerName:"",email:"",phone:"",pudoPoint:""});
  async function refresh(){
    try{
      const p=await storeRequest("/api/products");
      if(!p.ok) throw new Error(p.status===401?"Owner sign-in is required for staging data.":"OSK database is not connected yet.");
      setProducts(await p.json());
    }catch(e){setNotice(e instanceof Error?e.message:"Could not load staging data");}
    finally{setLoading(false);}
  }
  useEffect(()=>{setDemo(isLocalDemo());refresh();try{setBasket(JSON.parse(localStorage.getItem("osk-basket")||"{}"));}catch{}setBasketReady(true);},[]);
  useEffect(()=>{if(basketReady)localStorage.setItem("osk-basket",JSON.stringify(basket));},[basket,basketReady]);
  const visible=products.filter(p=>p.active&&!p.archived&&(kind==="all"||p.kind===kind)&&(!bikeYear||(p.year_from!==null&&p.year_to!==null&&Number(bikeYear)>=p.year_from&&Number(bikeYear)<=p.year_to))&&`${p.name} ${p.fitment} ${p.bike_model} ${p.control_assembly}`.toLowerCase().includes(query.toLowerCase()));
  const lines=useMemo(()=>Object.entries(basket).map(([id,quantity])=>({product:products.find(p=>p.id===id),quantity})).filter((x):x is {product:Product;quantity:number}=>Boolean(x.product?.active&&!x.product?.archived)),[basket,products]);
  const total=lines.reduce((s,x)=>s+x.product.price_cents*x.quantity,0);
  const count=lines.reduce((s,x)=>s+x.quantity,0);
  const changeQty=(id:string,q:number)=>setBasket(b=>{const n={...b};if(q<1)delete n[id];else n[id]=q;return n;});
  async function placeOrder(e:React.FormEvent){
    e.preventDefault();setSaving(true);
    const r=await storeRequest("/api/orders",{method:"POST",headers:jsonHeaders,body:JSON.stringify({...details,items:lines.map(x=>({id:x.product.id,quantity:x.quantity}))})});
    const data=(await r.json()) as {id:string;error:string};setSaving(false);
    if(r.ok){setPlaced(data.id);setBasket({});refresh();}else setNotice(data.error);
  }
  return <div className="site-shell">
    <div className="private-strip"><span className="status-dot"/> {demo?(partnerPreview?"PARTNER DEMO":"LOCAL DEMO"):"PRIVATE STAGING"} <span className="slash">/</span> {demo?"SIMULATED PAYMENTS":"TEST PAYMENTS ONLY"} <span className="strip-right">{demo?"Saved in this browser · Not connected to Supabase":"Owner access only · No public launch"}</span></div>
    <header className="site-header"><button className="brand" onClick={()=>setTab("shop")} aria-label="OSK home"><img src={logoUrl} alt="OSK Oh Sh*t Kit"/><small>TEMPORARY<br/>EMERGENCY KITS</small></button><nav aria-label="Main navigation"><button className={tab==="shop"?"selected":""} onClick={()=>setTab("shop")}>Shop</button><button className={tab==="basket"?"selected":""} onClick={()=>setTab("basket")}>Basket <b>{count}</b></button><button onClick={()=>window.location.assign(adminUrl())}>Admin</button></nav></header>
    {demo&&<div className="demo-banner"><strong>DEMO STORE</strong><span>Sample products, prices and stock. Compatibility is unverified. Use dummy customer details.</span><button onClick={()=>{window.location.assign(adminUrl("orders"));}}>View sample order ↗</button></div>}
    {notice&&<div className="notice" role="status">{notice}<button onClick={()=>setNotice("")} aria-label="Dismiss">×</button></div>}
    {tab==="shop"&&<main>
      <section className="hero"><div className="hero-copy"><p className="eyebrow">OSK / SOUTH AFRICA / PRIVATE PREVIEW</p><h1>When the trail<br/><em>takes a turn.</em></h1><p className="hero-lede">Temporary 3D-printed emergency brake and clutch lever kits. Product details and use guidance are being prepared by OSK.</p><div className="hero-actions"><a href="#catalogue" className="button orange">Explore kits <span>↗</span></a><span>Fitment must be confirmed before sale.</span></div></div><div className="hero-art" aria-hidden="true"><div className="art-caption">KTM 300 EXC / FITMENT PENDING</div></div></section>
      <section className="signal-row"><span><b>01</b> Temporary emergency use</span><span><b>02</b> Fitment checked per bike</span><span><b>03</b> PUDO fulfilment planned</span></section>
      <section id="catalogue" className="catalogue"><div className="section-heading"><div><p className="eyebrow dark">THE LINE-UP</p><h2>Emergency essentials.</h2><p className="muted">The catalogue is being configured. Product fitment, years, and prices remain unconfirmed until entered by OSK.</p></div><span className="section-index">01 / PRODUCTS</span></div><div className="filters"><label>Search<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Product or fitment"/></label><label>Type<select value={kind} onChange={e=>setKind(e.target.value)}><option value="all">All kits</option><option value="brake">Brake</option><option value="clutch">Clutch</option><option value="kit">Bundle</option></select></label><label>Bike model<select aria-label="Bike model"><option>KTM 300 EXC</option></select></label><label>Year<select value={bikeYear} onChange={e=>setBikeYear(e.target.value)}><option value="">All years</option>{Array.from(new Set(products.filter(p=>p.active&&!p.archived&&p.year_from!==null&&p.year_to!==null).flatMap(p=>Array.from({length:p.year_to!-p.year_from!+1},(_,i)=>p.year_from!+i)))).sort((a,b)=>b-a).map(y=><option key={y} value={y}>{y}</option>)}</select></label></div>
      {loading?<p className="empty">Loading catalogue…</p>:visible.length?<div className="product-grid">{visible.map((p,i)=><article className="product-card" key={p.id}><div className="product-visual"><span className="product-number">0{i+1} / {demo?"DEMO PRODUCT":"OSK"}</span><div className="visual-disc"/><div className="visual-arm"/><span className="visual-word">{p.kind.toUpperCase()}</span></div><div className="product-info"><p className="eyebrow dark">EMERGENCY / {p.kind.toUpperCase()}</p><h3>{p.name}</h3><p>{p.description}</p><p className="fitment">FITMENT · {p.fitment}</p><div className="product-bottom"><strong>{money(p.price_cents)}</strong><button className="button dark" disabled={p.stock<1} onClick={()=>{changeQty(p.id,Math.min((basket[p.id]||0)+1,p.stock));setNotice(`${p.name} added to basket.`);}}>{p.stock>0?"Add to basket +":"Out of stock"}</button></div></div></article>)}</div>:<div className="empty-state"><span className="empty-code">OSK / 000</span><h3>No products live yet.</h3><p>Draft products stay hidden until their exact fitment and pricing are confirmed in Admin.</p><button className="text-link" onClick={()=>window.location.assign(adminUrl("products"))}>Open admin ↗</button></div>}</section>
      <section className="disclaimer"><div><p className="eyebrow">BEFORE THE RIDE</p><h2>Know what fits.</h2></div><p>These products are intended as temporary emergency parts. Check the exact motorcycle year, control assembly and product details before using or ordering. OSK has not approved any compatibility or safety statement in this staging version.</p></section>
    </main>}
    {tab==="basket"&&<main className="inner-page"><p className="eyebrow dark">YOUR ORDER / STAGING</p><h1>Basket<span className="orange-text">.</span></h1>{placed?<div className="empty-state"><h2>{demo?"Demo order created.":"Order draft created."}</h2><p>Reference <b>{placed}</b>. No payment has been taken. Open Admin to review the order and try the test payment flow.</p><button className="button dark" onClick={()=>{setPlaced("");window.location.assign(adminUrl("orders"));}}>View orders ↗</button></div>:lines.length?<div className="basket-layout"><div className="basket-list">{lines.map(({product:p,quantity})=><div className="basket-line" key={p.id}><div><span className="eyebrow dark">{p.kind.toUpperCase()} KIT</span><h3>{p.name}</h3><small>{p.fitment}</small></div><div className="qty"><button onClick={()=>changeQty(p.id,quantity-1)} aria-label={`Remove one ${p.name}`}>−</button><span>{quantity}</span><button onClick={()=>changeQty(p.id,Math.min(quantity+1,p.stock))} aria-label={`Add one ${p.name}`}>+</button></div><strong>{money(p.price_cents*quantity)}</strong></div>)}</div><form className="checkout-panel" onSubmit={placeOrder}><h2>Order details</h2><p className="muted">Manual PUDO fulfilment. Shipping cost and pickup point are confirmed separately; this order is a staging draft.</p><label>Name<input required value={details.customerName} onChange={e=>setDetails({...details,customerName:e.target.value})}/></label><label>Email<input required type="email" value={details.email} onChange={e=>setDetails({...details,email:e.target.value})}/></label><label>Phone<input required value={details.phone} onChange={e=>setDetails({...details,phone:e.target.value})}/></label><label>Preferred PUDO pickup point<input required value={details.pudoPoint} onChange={e=>setDetails({...details,pudoPoint:e.target.value})} placeholder="Name and area"/></label><div className="total"><span>Products total</span><strong>{money(total)}</strong></div><p className="muted tiny">Shipping is not included. No payment is collected at this step.</p><button className="button orange full" disabled={saving}>Create staging order ↗</button></form></div>:<div className="empty-state"><h2>Your basket is empty.</h2><p>Published kits will appear in the catalogue when fitment is confirmed.</p><button className="text-link" onClick={()=>setTab("shop")}>Browse catalogue ↗</button></div>}</main>}
    <footer><img className="footer-logo" src={logoUrl} alt="OSK Oh Sh*t Kit"/><p>Private prototype · South Africa · No live payments</p><span>Temporary emergency kits</span></footer>
  </div>;
}
