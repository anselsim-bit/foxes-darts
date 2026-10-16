import { useRef } from "react";
import { CalendarDays, Trophy, Flag, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TournamentCard } from "@/components/tournament-card";
import { groupTournaments, tournamentSections, type TournamentDisplay } from "@/lib/tournament-display";

export function TournamentCarousel({ tournaments, today }: { tournaments: TournamentDisplay[]; today: string }) {
  const groups = groupTournaments(tournaments, today);
  const icons = { upcoming: CalendarDays, ongoing: Flag, finished: Trophy };
  const viewport = useRef<HTMLDivElement>(null);
  function move(direction: number) {
    const element = viewport.current;
    if (!element || !element.clientWidth) return;
    const current = Math.round(element.scrollLeft / element.clientWidth);
    const next = (current + direction + tournamentSections.length) % tournamentSections.length;
    element.scrollTo({ left: next * element.clientWidth, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }
  return (
    <section className="mx-auto max-w-6xl px-4 py-14">
      <div role="region" aria-roledescription="carrousel" aria-label="Catégories de tournois">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <div />
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => move(-1)} aria-label="Catégorie précédente" title="Catégorie précédente"><ArrowLeft /></Button>
            <Button variant="outline" size="icon" onClick={() => move(1)} aria-label="Catégorie suivante" title="Catégorie suivante"><ArrowRight /></Button>
          </div>
        </div>
        <div ref={viewport} className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tournamentSections.map(({ key, title, empty }) => {
            const Icon = icons[key];
            return (
              <div key={key} role="group" aria-roledescription="diapositive" aria-label={title} className="min-w-0 shrink-0 basis-full snap-start">
                <h2 className="mb-6 flex items-start gap-3 text-2xl md:text-3xl"><Icon className="mt-1 h-7 w-7 shrink-0 text-primary" />{title}</h2>
                {groups[key].length === 0 ? <p className="min-h-40 text-muted-foreground">{empty}</p> : (
                  <div className="grid gap-6 md:grid-cols-3">{groups[key].slice(0, 3).map(t => <TournamentCard key={t.id} tournament={t} category={key} />)}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}