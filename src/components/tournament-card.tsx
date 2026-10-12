import { Link } from "@tanstack/react-router";
import { CalendarDays, MapPin, Users, Ticket, ArrowRight, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isTournamentFull, type TournamentCategory, type TournamentDisplay } from "@/lib/tournament-display";

export function TournamentCard({ tournament: t, category }: { tournament: TournamentDisplay; category: TournamentCategory }) {
  const full = isTournamentFull(t);
  const date = new Date(t.event_date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  return (
    <article className="card-hover group relative flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card">
      <Link
        to="/tournois/$id"
        params={{ id: t.id }}
        aria-label={`Voir ${t.title}`}
        className="absolute inset-0 z-10 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      />
      {t.image_url && <img src={t.image_url} alt={t.title} className="h-44 w-full object-cover" loading="lazy" />}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="break-words text-lg transition-colors group-hover:text-primary">{t.title}</h3>
        <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
          <p className="flex items-start gap-2"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>{date}{t.start_time ? ` · ${t.start_time.slice(0, 5).replace(":", "h")}${t.end_time ? ` – ${t.end_time.slice(0, 5).replace(":", "h")}` : ""}` : ""}</span></p>
          <p className="flex items-start gap-2"><Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>{t.format === "equipe" ? "En équipe" : "Solo"}{t.max_participants ? ` · ${t.registrations_count}/${t.max_participants} ${t.format === "equipe" ? "équipes" : "participants"}` : ""}</span></p>
          {t.location && <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>{t.location}</span></p>}
        </div>
        {t.description && <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{t.description}</p>}
        <div className="mt-auto flex flex-wrap gap-2 pt-5">
          {category !== "upcoming" ? (
            <Button asChild variant="outline" className="relative z-20"><Link to="/tournois/$id" params={{ id: t.id }}><ArrowRight />{category === "ongoing" ? "Voir le tableau" : "Voir les résultats"}</Link></Button>
          ) : full ? (
            <span className="inline-flex h-9 items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-4 text-sm font-semibold text-primary"><LockKeyhole className="h-4 w-4" />Complet</span>
          ) : t.helloasso_url ? (
            <Button asChild className="relative z-20"><a href={t.helloasso_url} target="_blank" rel="noopener noreferrer"><Ticket />Billetterie HelloAsso</a></Button>
          ) : (
            <Button asChild className="relative z-20"><Link to="/tournois/$id" params={{ id: t.id }}>S'inscrire</Link></Button>
          )}
        </div>
      </div>
    </article>
  );
}