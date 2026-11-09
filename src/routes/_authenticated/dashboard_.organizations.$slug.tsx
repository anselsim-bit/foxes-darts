import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LegacyClubAdmin } from "./admin";
import { OrganizationManager } from "@/components/organization-manager";
export const Route=createFileRoute('/_authenticated/dashboard_/organizations/$slug')({head:()=>({meta:[{title:"Gestion de l’organisation — Foxes Darts"},{name:"description",content:"Tournois, collaborateurs et paramètres de votre organisation."},{property:"og:title",content:"Gestion de l’organisation — Foxes Darts"},{property:"og:description",content:"Tournois, collaborateurs et paramètres de votre organisation."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary"}]}),component:()=>{const {slug}=Route.useParams();const [legacy,setLegacy]=useState(false);return <>{slug==="foxes-darts"&&<div className="mx-auto max-w-6xl px-4 pt-5"><Button variant="outline" onClick={()=>setLegacy(!legacy)}>{legacy?"Espace organisation":"Gestion complète Foxes Darts"}</Button></div>}{legacy?<LegacyClubAdmin/>:<OrganizationManager slug={slug}/>}</>}});
