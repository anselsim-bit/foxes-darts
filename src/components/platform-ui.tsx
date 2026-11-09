import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "./ui/button";
export const fieldClass="w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
export function Field({label,...props}:{label:string}&React.InputHTMLAttributes<HTMLInputElement>){return <label className="block space-y-1 text-sm"><span>{label}</span><input {...props} className={fieldClass}/></label>}
export function PageHeading({title,children}:{title:string;children?:React.ReactNode}){return <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5"><h1 className="text-3xl">{title}</h1>{children}</div>}
export function Metric({label,value}:{label:string;value:number|string}){return <div className="border-l-2 border-primary py-2 pl-4"><p className="text-3xl font-semibold">{value}</p><p className="text-sm text-muted-foreground">{label}</p></div>}
export function AsyncButton({children,action,variant="default"}:{children:React.ReactNode;action:()=>Promise<unknown>;variant?:"default"|"outline"|"destructive"}){const [busy,setBusy]=useState(false);return <Button variant={variant} disabled={busy} onClick={async()=>{setBusy(true);try{await action()}finally{setBusy(false)}}}>{busy?"En cours…":children}</Button>}
export function OrganizationLinks({organizations}:{organizations:{id:string;name:string;slug:string;role:string}[]}){return <div className="flex flex-wrap gap-3">{organizations.map(o=><Button asChild variant="outline" key={o.id}><Link to="/dashboard/organizations/$slug" params={{slug:o.slug}}>{o.name}</Link></Button>)}</div>}
