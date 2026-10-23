"use client";
import {useCallback,useRef,useState} from "react";
import type {Activity,Movement,Order,Product} from "../server/supabase";
import {storeRequest} from "../demo-store";

export function useAdminStore(){
  const [products,setProducts]=useState<Product[]>([]);
  const [orders,setOrders]=useState<Order[]>([]);
  const [activity,setActivity]=useState<Activity[]>([]);
  const [movements,setMovements]=useState<Movement[]>([]);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
  const [error,setError]=useState(""),[message,setMessage]=useState("");
  const [activityReady,setActivityReady]=useState(false);
  const revision=useRef(0);
  const load=useCallback(async()=>{
    const current=++revision.current;
    setError("");
    try{
      const [p,o,a]=await Promise.all([storeRequest("/api/products"),storeRequest("/api/orders"),storeRequest("/api/admin/activity")]);
      if(!p.ok||!o.ok)throw new Error("The OSK database is not connected. Products and orders could not be loaded.");
      const [nextProducts,nextOrders]=await Promise.all([p.json(),o.json()]);
      const history=a.ok?await a.json() as {activity:Activity[];movements:Movement[]}:null;
      if(current!==revision.current)return;
      setProducts(nextProducts as Product[]);setOrders(nextOrders as Order[]);
      setActivityReady(a.ok);setActivity(history?.activity||[]);setMovements(history?.movements||[]);
    }catch(e){if(current===revision.current)setError(e instanceof Error?e.message:"Could not load admin data.");}
    finally{if(current===revision.current)setLoading(false);}
  },[]);
  async function mutate<T=Record<string,unknown>>(url:string,method:string,data:unknown,success:string):Promise<T|null>{
    setBusy(true);setError("");setMessage("");
    try{
      const response=await storeRequest(url,{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
      const body=await response.json() as T&{error?:string};
      if(!response.ok)throw new Error(body.error||"Could not save changes.");
      setMessage(success);await load();return body;
    }catch(e){setError(e instanceof Error?e.message:"Could not save changes.");return null;}
    finally{setBusy(false);}
  }
  return {products,orders,activity,movements,loading,busy,error,message,activityReady,load,mutate,setBusy,setError,setMessage};
}
