export const paidStatuses=new Set(["test_succeeded","demo_simulated"]);
export const fulfilmentTransitions:Record<string,string[]>={new:["new","packing","cancelled"],packing:["packing","sent","cancelled"],sent:["sent","delivered"],delivered:["delivered"],cancelled:["cancelled"]};
export function fulfilmentError(current:string,next:string,payment:string,tracking:string){
  if(!fulfilmentTransitions[current]?.includes(next))return "That order status transition is not allowed.";
  if(next!==current&&["packing","sent","delivered"].includes(next)&&!paidStatuses.has(payment))return "Confirm payment before starting fulfilment.";
  if(["sent","delivered"].includes(next)&&!tracking.trim())return "Add a tracking reference before marking an order sent.";
  return null;
}
export function stockError(current:number,delta:number,expected:number,reason:string){
  if(!Number.isSafeInteger(delta)||delta===0||Math.abs(delta)>100000)return "Enter a non-zero whole quantity up to 100,000.";
  if(current!==expected)return "Stock changed since you opened this form. Refresh and try again.";
  if(current+delta<0)return "Stock cannot fall below zero.";
  if(reason.trim().length<3||reason.length>500)return "Give a reason between 3 and 500 characters.";
  return null;
}
export function safeItems(value:string):{id?:string;name:string;quantity:number;unit_cents?:number}[]{try{const x=JSON.parse(value);return Array.isArray(x)?x:[];}catch{return [];}}
