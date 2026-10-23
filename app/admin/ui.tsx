"use client";
import {useEffect,useRef,type ReactNode} from "react";
import {X} from "lucide-react";
export function Badge({children,tone="neutral"}:{children:ReactNode;tone?:string}){return <span className={`ac-badge ${tone}`}>{children}</span>;}
export function Field({label:caption,children,wide=false}:{label:string;children:ReactNode;wide?:boolean}){return <label className={wide?"ac-field wide":"ac-field"}><span>{caption}</span>{children}</label>;}
export function Sheet({title,subtitle,children,onClose}:{title:string;subtitle:string;children:ReactNode;onClose:()=>void}){
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const el=ref.current;el?.showModal();const old=document.body.style.overflow;document.body.style.overflow="hidden";return()=>{document.body.style.overflow=old;};},[]);
  return <dialog ref={ref} className="ac-sheet" aria-label={title} onCancel={onClose}><header><div><p>{subtitle}</p><h2>{title}</h2></div><button type="button" className="ac-icon" onClick={onClose} aria-label="Close editor"><X size={20}/></button></header>{children}</dialog>;
}
