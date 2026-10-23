export const money=(c:number)=>new Intl.NumberFormat("en-ZA",{style:"currency",currency:"ZAR"}).format(c/100);
export const date=(s:string)=>new Date(s).toLocaleString("en-ZA",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});
export const label=(s:string)=>s.replaceAll("_"," ");
export function exportCsv(name:string,rows:unknown[][]){
  const content=rows.map(row=>row.map(value=>{let s=String(value??"");if(/^[=+\-@\t\r]/.test(s))s="'"+s;return `"${s.replaceAll('"','""')}"`;}).join(",")).join("\r\n");
  const url=URL.createObjectURL(new Blob(["\uFEFF",content],{type:"text/csv;charset=utf-8;"}));const a=document.createElement("a");a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);
}
