import { describeAudit, type AuditMatch } from "./audit-labels";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { publicClient, signImageUrls } from "./public.functions";
import { organizationSlug, safeColor } from "./platform-validation";
import { themeColorsFromForm } from "./organization-theme";
import { requirePlatformAdmin, type OrganizationContext } from "./organization-access";

async function manage(ctx: OrganizationContext, id: string) {
  const { data, error } = await ctx.supabase.rpc("can_manage_organization", { _organization_id: id });
  if (error || !data) throw new Error("Vous ne pouvez pas gérer cette organisation.");
}
async function hashToken(token: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)))).map(n => n.toString(16).padStart(2,"0")).join("");
}
export const createOrganization = createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((input:{name:string;description:string;settings:Record<string,string>})=>input).handler(async ({data,context})=>{
  const slug=organizationSlug(data.name);
  if (!slug) throw new Error("Nom d'organisation invalide.");
  safeColor(data.settings["primary_color"] ?? "#e85d3a"); safeColor(data.settings["secondary_color"] ?? "#1a1a1a");
  let result=await context.supabase.rpc("create_organization_space",{_name:data.name,_slug:slug,_description:data.description,_settings:data.settings});
  let finalSlug=slug;
  if(result.error?.code==="23505") {finalSlug=`${slug}-${crypto.randomUUID().slice(0,8)}`;result=await context.supabase.rpc("create_organization_space",{_name:data.name,_slug:finalSlug,_description:data.description,_settings:data.settings});}
  if(result.error?.message?.includes("awaits validation")) throw new Error("La création d’organisations est momentanément fermée. Elle sera bientôt ouverte avec un abonnement.");
  if(result.error) throw new Error("Création impossible. Vérifiez les informations ou réessayez plus tard.");
  return {id:result.data,slug:finalSlug};
});
export const getDashboard = createServerFn({method:"GET"}).middleware([requireSupabaseAuth]).handler(async ({context})=>{
  const [profile,members,players,registrations,stats,notifications,games] = await Promise.all([
    context.supabase.from("profiles").select("display_name,first_name,last_name,avatar_path").eq("id",context.userId).single(),
    context.supabase.from("organization_members").select("organization_id,role,organizations(id,name,slug,status)").eq("user_id",context.userId),
    context.supabase.from("organization_players").select("organization_id,organizations(id,name,slug,status)").eq("user_id",context.userId),
    context.supabase.from("registrations").select("id,tournament_id,tournaments(id,title,event_date,status,organization_id)").eq("user_id",context.userId).order("created_at",{ascending:false}).limit(50),
    context.supabase.from("player_stats").select("matches_played,wins,losses,best_score").eq("user_id",context.userId).maybeSingle(),
    context.supabase.from("notifications").select("id,kind,payload,read_at,created_at").eq("recipient_id",context.userId).order("created_at",{ascending:false}).limit(30),
    context.supabase.from("games").select("id,winner_name,start_score,created_at").eq("recorded_by",context.userId).order("created_at",{ascending:false}).limit(20),
  ]);
  const organizations = new Map<string,{id:string;name:string;slug:string;status:string;role:string}>();
  for(const p of players.data??[]) if(p.organizations) organizations.set(p.organization_id,{...p.organizations,role:"PLAYER"});
  for(const m of members.data??[]) if(m.organizations) organizations.set(m.organization_id,{...m.organizations,role:m.role});
  const {data:superAdmin}=await context.supabase.rpc("is_platform_admin");
  return {profile:profile.data,organizations:[...organizations.values()],registrations:registrations.data??[],stats:stats.data,notifications:notifications.data??[],games:games.data??[],superAdmin:!!superAdmin,userId:context.userId};
});
export const getOrganizationSpace = createServerFn({method:"GET"}).middleware([requireSupabaseAuth]).inputValidator((input:{slug:string})=>input).handler(async ({data,context})=>{
  const {data:org,error}=await context.supabase.from("organizations").select("id,name,slug,status,description,visibility,tournament_limit").eq("slug",data.slug).single();
  if(error||!org) throw new Error("Organisation introuvable.");
  const {data:membership}=await context.supabase.from("organization_members").select("role").eq("organization_id",org.id).eq("user_id",context.userId).maybeSingle();
  const {data:superAdmin}=await context.supabase.rpc("is_platform_admin");
  if(!membership&&!superAdmin) throw new Error("Accès réservé aux collaborateurs de cette organisation.");
  const manager=membership?.role==="TOURNAMENT_MANAGER"&&!superAdmin;
  const [settings,tournaments,players,members,invitations,audit]=await Promise.all([
    manager?Promise.resolve({data:null}):context.supabase.from("organization_settings").select("*").eq("organization_id",org.id).maybeSingle(),
    context.supabase.from("tournaments").select("*").eq("organization_id",org.id).order("event_date",{ascending:false}).limit(100),
    manager?Promise.resolve({data:[]}):context.supabase.from("organization_players").select("user_id,category,membership_status,notes,profiles(display_name)").eq("organization_id",org.id).limit(100),
    manager?Promise.resolve({data:[]}):context.supabase.from("organization_members").select("user_id,role,profiles(display_name)").eq("organization_id",org.id),
    manager?Promise.resolve({data:[]}):context.supabase.from("organization_invitations").select("id,email,role,status,expires_at,created_at").eq("organization_id",org.id).order("created_at",{ascending:false}).limit(50),
    manager?Promise.resolve({data:[]}):context.supabase.from("organization_audit_events").select("id,action,details,created_at").eq("organization_id",org.id).order("created_at",{ascending:false}).limit(20),
  ]);
  const allowed=[];
  for(const t of tournaments.data??[]) {const {data:ok}=await context.supabase.rpc("can_manage_tournament",{_tournament_id:t.id});if(ok) allowed.push(t);}
  const ids=allowed.map(t=>t.id);
  const {data:matches}=ids.length?await context.supabase.from("tournament_matches").select("id,tournament_id,winner,score_a,score_b,stage,created_at").in("tournament_id",ids).not("winner","is",null).order("created_at",{ascending:false}).limit(50):{data:[]};
  const auditRows=(audit.data??[]) as {id:string;action:string;details:Record<string,unknown>|null;created_at:string}[];
  const matchIds=auditRows.map(a=>a.details?.["match_id"]).filter((v):v is string=>typeof v==="string");
  const auditMatches=new Map<string,AuditMatch>();
  if(matchIds.length){const {data:ms}=await context.supabase.from("tournament_matches").select("id,stage,team_a,team_b,winner,score_a,score_b,legs_a,legs_b,tournament_id").in("id",matchIds);const teamIds=[...new Set((ms??[]).flatMap(m=>[m.team_a,m.team_b]).filter((v):v is string=>!!v))];const {data:teams}=teamIds.length?await context.supabase.from("tournament_teams").select("id,name").in("id",teamIds):{data:[]};const tn=new Map((teams??[]).map(t=>[t.id,t.name]));const tt=new Map((tournaments.data??[]).map(t=>[t.id,t.title]));for(const m of ms??[])auditMatches.set(m.id,{tournament:tt.get(m.tournament_id)??"Tournoi",stage:m.stage,teamA:tn.get(m.team_a??"")??"Équipe",teamB:tn.get(m.team_b??"")??"Équipe",winner:m.winner?tn.get(m.winner)??null:null,scoreA:m.score_a,scoreB:m.score_b,legsA:m.legs_a,legsB:m.legs_b});}
  const auditOut=auditRows.map(a=>({id:a.id,action:a.action,created_at:a.created_at,label:describeAudit(a.action,a.details,typeof a.details?.["match_id"]==="string"?auditMatches.get(a.details["match_id"] as string):null)}));
  return {org,settings:settings.data,tournaments:allowed,players:players.data??[],members:members.data??[],invitations:invitations.data??[],audit:auditOut,results:matches??[],role:superAdmin?"SUPER_ADMIN":membership?.role??"PLAYER",userId:context.userId};
});
export const saveOrganization = createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((input:{id:string;name:string;description:string;settings:Record<string,string>})=>input).handler(async ({data,context})=>{
  await manage(context,data.id);
  if(data.name.trim().length<2) throw new Error("Nom trop court.");
  safeColor(data.settings["primary_color"]??"");safeColor(data.settings["secondary_color"]??"");
  const social=Object.fromEntries(["website","facebook","instagram"].map(k=>[k,(data.settings[k]??"").trim()]).filter(([,v])=>/^https:\/\/[^\s]{3,300}$/.test(v??"")));
  if(["website","facebook","instagram"].some(k=>(data.settings[k]??"").trim()&&!social[k])) throw new Error("Les liens doivent commencer par https://");
  const {error}=await context.supabase.rpc("save_organization_settings",{_organization_id:data.id,_name:data.name,_description:data.description,_settings:{...data.settings,social_links:social,theme_colors:themeColorsFromForm(data.settings)}});
  if(error) throw new Error("Impossible d'enregistrer les paramètres.");
  return {ok:true};
});
export const inviteCollaborator = createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((input:{organizationId:string;email:string;role:string})=>input).handler(async ({data,context})=>{
  await manage(context,data.organizationId);
  const token=crypto.randomUUID()+crypto.randomUUID();
  const {data:id,error}=await context.supabase.rpc("create_organization_invitation",{_organization_id:data.organizationId,_email:data.email,_role:data.role,_token_hash:await hashToken(token)});
  if(error) throw new Error("Invitation impossible : vérifiez l'adresse ou réessayez plus tard.");
  const {data:org}=await context.supabase.from("organizations").select("name").eq("id",data.organizationId).single();
  const {sendTemplateEmail}=await import("./email-templates/send-email");
  try {const sent=await sendTemplateEmail("organization-invitation",data.email,{templateData:{organizationName:org?.name??"Organisation",url:`https://foxesdarts.com/invitation?token=${encodeURIComponent(token)}`},idempotencyKey:`organization-invitation-${id}`});return {ok:true,emailSent:sent.sent};}
  catch {return {ok:true,emailSent:false};}
});
export const respondInvitation = createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((input:{token:string;accept:boolean})=>input).handler(async ({data,context})=>{
  const {data:id,error}=await context.supabase.rpc("respond_organization_invitation",{_token_hash:await hashToken(data.token),_accept:data.accept});
  if(error) throw new Error("Invitation expirée, déjà utilisée ou destinée à un autre compte.");
  const {data:org}=await context.supabase.from("organizations").select("slug").eq("id",id).single();return {slug:org?.slug??"",accepted:data.accept};
});
export const cancelInvitation = createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((input:{id:string;organizationId:string})=>input).handler(async ({data,context})=>{
  await manage(context,data.organizationId);const {error}=await context.supabase.from("organization_invitations").update({status:"cancelled"}).eq("id",data.id).eq("organization_id",data.organizationId);if(error) throw new Error("Annulation impossible.");return {ok:true};
});
export const changeCollaborator = createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((input:{organizationId:string;userId:string;role:string|null;transfer?:boolean})=>input).handler(async ({data,context})=>{
  const result=data.transfer?await context.supabase.rpc("transfer_organization_ownership",{_organization_id:data.organizationId,_user_id:data.userId}):await context.supabase.rpc("change_organization_collaborator",{_organization_id:data.organizationId,_user_id:data.userId,_role:data.role as string});
  if(result.error) throw new Error("Modification refusée : collaborateur protégé ou droits insuffisants.");return {ok:true};
});
export const markNotificationRead=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((input:{id:string})=>input).handler(async ({data,context})=>{await context.supabase.from("notifications").update({read_at:new Date().toISOString()}).eq("id",data.id).eq("recipient_id",context.userId);return {ok:true};});
export const publicOrganization=createServerFn({method:"GET"}).inputValidator((input:{slug:string;tournamentId?:string})=>input).handler(async ({data})=>{
  const sb=publicClient();const {data:org,error}=await sb.from("organizations").select("id,name,slug,description,status").eq("slug",data.slug).single();if(error||!org)throw new Error("Organisation introuvable.");
  const {data:info}=await sb.rpc("get_public_organization_settings",{_organization_id:org.id});
  const raw=(info??{}) as Record<string,unknown>;const media=[raw["logo_path"],raw["cover_path"]].filter((p):p is string=>typeof p==="string");
  const signed=media.length?await signImageUrls(sb,media,org.id):{};
  const branding={logoUrl:typeof raw["logo_path"]==="string"?signed[raw["logo_path"]]??null:null,coverUrl:typeof raw["cover_path"]==="string"?signed[raw["cover_path"]]??null:null,social:(raw["social_links"]??{}) as Record<string,string>};
  const {data:ts}=await sb.from("tournaments").select("id,title,event_date,status,description,location").eq("organization_id",org.id).order("event_date",{ascending:false}).limit(100);
  if(data.tournamentId&&!ts?.some(t=>t.id===data.tournamentId))throw new Error("Ce tournoi n'appartient pas à cette organisation.");
  const {data:standings}=await sb.from("standings").select("season,rank,player_name,points").eq("organization_id",org.id).order("rank").limit(50);
  return {org,branding,settings:info as Record<string,string>|null,tournaments:ts??[],standings:standings??[]};
});
export const getPlatformAdmin=createServerFn({method:"GET"}).middleware([requireSupabaseAuth]).inputValidator((input:{search?:string;page?:number})=>input).handler(async ({data,context})=>{
  await requirePlatformAdmin(context);const page=Math.max(0,data.page??0);const search=(data.search??"").replace(/[%,_]/g,"").slice(0,100);
  let orgQuery=context.supabase.from("organizations").select("id,name,slug,status,created_at,tournament_limit",{count:"exact"}).order("created_at",{ascending:false});if(search)orgQuery=orgQuery.ilike("name",`%${search}%`);
  let usersQuery=context.supabase.from("profiles").select("id,display_name,first_name,last_name,created_at",{count:"exact"}).order("created_at",{ascending:false});if(search)usersQuery=usersQuery.ilike("display_name",`%${search}%`);
  const [orgs,users,audit,roles,counts]=await Promise.all([orgQuery.range(page*25,page*25+24),usersQuery.range(page*25,page*25+24),context.supabase.from("organization_audit_events").select("id,action,organization_id,created_at,details").order("created_at",{ascending:false}).limit(50),context.supabase.from("organization_members").select("user_id,role,organizations(name)").limit(200),context.supabase.rpc("platform_counts")]);
  const {data:flag}=await context.supabase.from("platform_release_flags").select("enabled").eq("name","organization_onboarding").maybeSingle();
  return {organizations:orgs.data??[],users:users.data??[],audit:audit.data??[],roles:roles.data??[],counts:counts.data as Record<string,number>|null,totalOrganizations:orgs.count??0,totalUsers:users.count??0,onboardingOpen:Boolean(flag?.enabled)};
});
export const setOrganizationStatus=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((input:{id:string;status:string})=>input).handler(async ({data,context})=>{await requirePlatformAdmin(context);const {error}=await context.supabase.rpc("set_organization_status",{_organization_id:data.id,_status:data.status});if(error)throw new Error("Modification du statut refusée.");return {ok:true};});
export const submitReport=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((input:{organizationId?:string|null;tournamentId?:string|null;reason:string})=>{const reason=String(input.reason??"").trim().slice(0,1000);if(reason.length<5)throw new Error("Décrivez le problème en quelques mots (5 caractères minimum).");const id=(v:unknown)=>typeof v==="string"&&/^[0-9a-f-]{36}$/i.test(v)?v:null;const organizationId=id(input.organizationId),tournamentId=id(input.tournamentId);if(!organizationId&&!tournamentId)throw new Error("Signalement invalide.");return {organizationId,tournamentId,reason};}).handler(async ({data,context})=>{
  const {count}=await context.supabase.from("content_reports").select("id",{count:"exact",head:true}).eq("reporter_id",context.userId).gte("created_at",new Date(Date.now()-86400000).toISOString());
  if((count??0)>=10)throw new Error("Trop de signalements aujourd'hui, réessayez demain.");
  const {error}=await context.supabase.from("content_reports").insert({reporter_id:context.userId,organization_id:data.organizationId,tournament_id:data.tournamentId,reason:data.reason});
  if(error)throw new Error("Signalement impossible.");return {ok:true};
});
export const listReports=createServerFn({method:"GET"}).middleware([requireSupabaseAuth]).handler(async ({context})=>{
  await requirePlatformAdmin(context);
  const {data}=await context.supabase.from("content_reports").select("id,reason,status,created_at,organizations(name,slug),tournaments(id,title),profiles(display_name)").order("created_at",{ascending:false}).limit(100);
  return data??[];
});
export const resolveReport=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((input:{id:string;status:"resolved"|"dismissed"})=>({id:String(input.id),status:input.status==="dismissed"?"dismissed" as const:"resolved" as const})).handler(async ({data,context})=>{
  await requirePlatformAdmin(context);
  const {error}=await context.supabase.from("content_reports").update({status:data.status,resolved_at:new Date().toISOString()}).eq("id",data.id);
  if(error)throw new Error("Mise à jour impossible.");return {ok:true};
});

export const setOrganizationOnboarding=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((input:{enabled:boolean})=>({enabled:input.enabled===true})).handler(async ({data,context})=>{await requirePlatformAdmin(context);const {error}=await context.supabase.rpc("set_organization_onboarding",{_enabled:data.enabled});if(error)throw new Error("Modification refusée.");return {ok:true};});
export const setOrganizationTournamentLimit=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((input:{id:string;limit:number|null})=>{const limit=input.limit===null?null:Math.floor(Number(input.limit));if(limit!==null&&(!Number.isFinite(limit)||limit<0||limit>10000))throw new Error("Nombre de tournois invalide.");return {id:String(input.id),limit};}).handler(async ({data,context})=>{await requirePlatformAdmin(context);const {error}=await context.supabase.rpc("set_organization_tournament_limit",{_organization_id:data.id,_limit:data.limit as number});if(error)throw new Error("Modification refusée.");return {ok:true};});
export const getOnboardingOpen=createServerFn({method:"GET"}).middleware([requireSupabaseAuth]).handler(async ({context})=>{const {data}=await context.supabase.rpc("organization_onboarding_open");return {open:Boolean(data)};});
