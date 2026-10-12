import { Link } from "@tanstack/react-router";
import { CalendarDays, Trophy, Flag } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { TournamentCard } from "@/components/tournament-card";
import { groupTournaments, tournamentSections, type TournamentDisplay } from "@/lib/tournament-display";

export function TournamentCarousel({ tournaments, today }: { tournaments: TournamentDisplay[]; today: string }) {
  const groups = groupTournaments(tournaments, today);
  const icons = { upcoming: CalendarDays, ongoing: Flag, finished: Trophy };
  return (
    <section className="mx-auto max-w-6xl px-4 py-14">
      <Carousel opts={{ loop: true, align: "start" }} aria-label="Catégories de tournois">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <Link to="/tournois" className="text-sm font-medium text-primary hover:underline">Tous les tournois</Link>
          <div className="flex items-center gap-2">
            <CarouselPrevious className="static translate-y-0" aria-label="Catégorie précédente" title="Catégorie précédente" />
            <CarouselNext className="static translate-y-0" aria-label="Catégorie suivante" title="Catégorie suivante" />
          </div>
        </div>
        <CarouselContent>
          {tournamentSections.map(({ key, title, empty }) => {
            const Icon = icons[key];
            return (
              <CarouselItem key={key} aria-label={title}>
                <h2 className="mb-6 flex items-start gap-3 text-2xl md:text-3xl"><Icon className="mt-1 h-7 w-7 shrink-0 text-primary" />{title}</h2>
                {groups[key].length === 0 ? <p className="min-h-40 text-muted-foreground">{empty}</p> : (
                  <div className="grid gap-6 md:grid-cols-3">{groups[key].slice(0, 3).map(t => <TournamentCard key={t.id} tournament={t} category={key} />)}</div>
                )}
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>
    </section>
  );
}