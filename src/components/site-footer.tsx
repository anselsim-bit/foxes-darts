import { Link } from "@tanstack/react-router";
import { Target } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 text-center md:flex-row md:justify-between md:text-left">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
            <Target className="h-4 w-4 text-primary-foreground" />
          </span>
          <span className="font-display text-sm uppercase">Foxes Darts</span>
        </div>
        <nav className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
          <Link to="/tournois" className="hover:text-foreground">
            Tournois
          </Link>
          <Link to="/galerie" className="hover:text-foreground">
            Galerie
          </Link>
          <Link to="/classements" className="hover:text-foreground">
            Classements
          </Link>
        </nav>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Foxes Darts — Association de fléchettes
        </p>
      </div>
    </footer>
  );
}
