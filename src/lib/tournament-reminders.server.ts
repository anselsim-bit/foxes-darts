import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendTemplateEmail } from "@/lib/email-templates/send-email";
import { tournamentRulesText } from "@/lib/tournament-rules-text";

const SITE = "https://foxesdarts.com";

/** Paris wall-clock parts for a given instant. */
export function parisParts(now: Date) {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" });
  const p = Object.fromEntries(f.formatToParts(now).map((x) => [x.type, x.value]));
  return { date: `${p["year"]}-${p["month"]}-${p["day"]}`, hour: Number(p["hour"]) };
}
export function nextDay(date: string) {
  const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10);
}

/** Sends one reminder per registered player for tournaments taking place tomorrow (Paris time). Runs only at 9h Paris. */
export async function sendTournamentReminders(now = new Date()) {
  const { date, hour } = parisParts(now);
  if (hour !== 9) return { skipped: true, sent: 0 };
  const tomorrow = nextDay(date);
  const { data: tournaments } = await supabaseAdmin.from("tournaments")
    .select("id,title,event_date,start_time,end_time,location,format,pool_count,consolation,start_score,double_out,pool_double_limit,final_start_score,final_double_out,consolation_start_score,consolation_double_out,consolation_double_limit,status,organization_id,organizations(name,status)")
    .eq("event_date", tomorrow).in("status", ["open", "started"]);
  let sent = 0;
  for (const t of tournaments ?? []) {
    const org = t.organizations as { name: string; status: string } | null;
    if (org && org.status !== "active") continue;
    const { data: settings } = t.organization_id ? await supabaseAdmin.from("organization_settings").select("contact_email,phone").eq("organization_id", t.organization_id).maybeSingle() : { data: null };
    const recipients = new Map<string, string | null>();
    const { data: teams } = await supabaseAdmin.from("tournament_teams").select("captain_id,name").eq("tournament_id", t.id);
    for (const team of teams ?? []) {
      if (!team.captain_id) continue;
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(team.captain_id);
      if (u.user?.email) recipients.set(u.user.email.toLowerCase(), team.name);
    }
    const { data: guests } = await supabaseAdmin.from("tournament_guest_registrations").select("email,first_name").eq("tournament_id", t.id);
    for (const g of guests ?? []) recipients.set(g.email.toLowerCase(), g.first_name);
    const { data: ha } = await supabaseAdmin.from("helloasso_registrations").select("email,first_name").eq("tournament_id", t.id);
    for (const r of ha ?? []) if (r.email) recipients.set(r.email.toLowerCase(), r.first_name);
    const templateData = {
      tournamentTitle: t.title,
      organizationName: org?.name ?? "Foxes Darts",
      tournamentDate: new Date(`${t.event_date}T12:00:00Z`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }),
      time: t.start_time ? `${t.start_time.slice(0, 5).replace(":", "h")}${t.end_time ? ` – ${t.end_time.slice(0, 5).replace(":", "h")}` : ""}` : undefined,
      location: t.location ?? undefined,
      organizerContact: [settings?.contact_email, settings?.phone].filter(Boolean).join(" · ") || undefined,
      rules: tournamentRulesText(t),
      tournamentUrl: `${SITE}/tournois/${t.id}`,
    };
    for (const [email, name] of recipients) {
      try {
        const r = await sendTemplateEmail("tournament-reminder", email, { templateData: { ...templateData, participantName: name ?? undefined }, idempotencyKey: `tournament-reminder-${t.id}-${email}` });
        if (r.sent) sent++;
      } catch (e) { console.error("reminder send failed", t.id, e instanceof Error ? e.message : e); }
    }
  }
  return { skipped: false, sent };
}
