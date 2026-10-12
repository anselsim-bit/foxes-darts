import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMyRoles } from "@/lib/admin.functions";
import { getNewTournamentsCount, markTournamentsSeen } from "@/lib/player.functions";
import logoAsset from "@/assets/foxes-logo.png.asset.json";

const NAV = [
  { to: "/", label: "Accueil" },
  { to: "/tournois", label: "Tournois" },
  { to: "/galerie", label: "Galerie" },
  { to: "/classements", label: "Classements" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Pastille: new tournaments since last visit; visiting /tournois clears it.
  useEffect(() => {
    if (!signedIn) {
      setNewCount(0);
      return;
    }
    let active = true;
    const run = async () => {
      if (pathname.startsWith("/tournois")) {
        await markTournamentsSeen();
        if (active) setNewCount(0);
      } else {
        const { count } = await getNewTournamentsCount();
        if (active) setNewCount(count);
      }
    };
    run().catch(() => {});
    return () => {
      active = false;
    };
  }, [signedIn, pathname]);

  useEffect(() => {
    let active = true;
    const check = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;
      setSignedIn(!!user);
      if (user) {
        const roles = await getMyRoles();
        if (active) setIsAdmin(roles.includes("admin"));
      } else {
        setIsAdmin(false);
      }
    };
    check();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => check());
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <img
            src={logoAsset.url}
            alt="Logo Foxes Darts"
            className="h-10 w-10 rounded-full object-cover"
            style={{ objectPosition: "50% 45%" }}
          />
          <span className="font-display text-lg uppercase tracking-wide">
            Foxes <span className="text-gradient-ember">Darts</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "rounded-md px-3 py-2 text-sm font-semibold text-primary" }}
            >
              {item.label}
              {item.to === "/tournois" && newCount > 0 && (
                <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground" title="Nouveaux tournois">
                  {newCount > 9 ? "9+" : newCount}
                </span>
              )}
            </Link>
          ))}
          {signedIn ? (
            <>
              <Link
                to="/mon-espace"
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "rounded-md px-3 py-2 text-sm font-semibold text-primary" }}
              >
                Mon espace
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  activeProps={{ className: "rounded-md px-3 py-2 text-sm font-semibold text-primary" }}
                >
                  Admin
                </Link>
              )}
              <button
                onClick={signOut}
                className="ml-2 inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <LogOut className="h-4 w-4" /> Déconnexion
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="ml-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Se connecter
            </Link>
          )}
        </nav>

        <button
          className="md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-border px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground"
                activeProps={{ className: "rounded-md px-3 py-2 text-sm font-semibold text-primary" }}
              >
                {item.label}
              {item.to === "/tournois" && newCount > 0 && (
                <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground" title="Nouveaux tournois">
                  {newCount > 9 ? "9+" : newCount}
                </span>
              )}
              </Link>
            ))}
            {signedIn ? (
              <>
                <Link
                  to="/mon-espace"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground"
                >
                  Mon espace
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground"
                  >
                    Admin
                  </Link>
                )}
                <button
                  onClick={() => {
                    setOpen(false);
                    signOut();
                  }}
                  className="rounded-md px-3 py-2 text-left text-sm text-muted-foreground"
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                onClick={() => setOpen(false)}
                className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
              >
                Se connecter
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
