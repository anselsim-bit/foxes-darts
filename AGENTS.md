<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Scoreboard member confirmation: members other than the signed-in recorder confirm with their password server-side, which yields an HMAC play token (GAME_TOKEN_SECRET) checked when saving a game — prevents falsifying other members' stats without exposing emails.
- tournament_teams enforces capacity; shared brackets/previews give byes to ranked pool winners and cross pool opponents.
- Failed preloads are suppressed only during a reload; otherwise preserve the original rejection for error boundaries, never return an undefined module.
- Tournament list reads return aggregate team counts only; shared display helpers and cards drive home and tournament categories so capacity labels and lifecycle grouping stay consistent without exposing participant identities.
- The home category carousel uses native CSS scroll snapping and app-owned React refs rather than an external React carousel hook to avoid dependency dispatcher mismatches and preserve touch navigation.
- Tournament access: public code-only endpoints validate the current admin-set code and started status for match listing and reporting; authenticated endpoints alone remember member claims, modify teams, or manage codes; emails carry only the play link (tournament_access_codes is deprecated) — allows guests to play without granting member or admin privileges.
- Tournament match settings come from persisted admin settings; dart-rules.ts replays visits to derive per-team checkout limits, shared by the scoreboard and tests — keeps undo, busts, advice and checkout validation consistent.
- Knockout matches require two winning legs; Game keeps completed legs in device drafts and alternates starters, while reporting validates and persists leg totals separately from remaining points — prevents advancing the bracket after only one leg and preserves pool ranking semantics.
- The shared Game scoreboard holds a completed non-winning visit locally until manual handover; only then is it appended to replayed turns — keeps the third dart visible for both free games and tournament matches without changing checkout counting.
- The Game scoreboard's restart action is an optional prop wired only by the free-play Compteur; tournament match pages never pass it, so a finished tournament match offers only board reporting — keeps tournament results from being replayed against the bracket.
- Tournament device storage retains the code and a versioned match draft; every return revalidates access and playable match settings server-side before restoring the Game's visits, current darts, pending handover, and multiplier. Clear drafts after successful reporting or confirmed abandonment — preserves accidental-navigation recovery without treating local storage as authority.
- Starting a tournament reuses the already-set access code without prompting the admin (the prompt appears only when no code exists yet; the upsert makes reuse a no-op), and a successful match report navigates the player from /tournois/$id/jouer to /tournois/$id so the board shows immediately — keeps the launch one-click and closes the loop on the result.
- The automatic HelloAsso sync skips a full tournament entirely (no API call, no refresh); only the admin's import button passes `force`. Inside a syncable tournament, no new team past capacity or once started (DB trigger stays backstop); partner-name completion still runs.
- The shared active Game uses a safe-area-aware dynamic-height viewport layout on phones, with a dedicated landscape grid; setup screens retain normal navigation — keeps all scoring controls visible without changing game rules.
- Admin role changes go through admin-verified server functions using the service client (user_roles has no client write policies); admins cannot remove their own admin role — avoids lockout and privilege escalation.
- Tournament QR codes encode the play URL with `?code=`; the play page treats it exactly like a typed code (server validation, device memory) and strips it from the address bar — a code change invalidates scanned access too.
- Every text input that has an associated action (add, rename, register, validate, save) must trigger that action on Enter — use a real `<form>` with a submit button where possible, otherwise an Enter key handler — so typing never needs a mouse.
- Tournament boards subscribe to Supabase Realtime (tournament_matches, tournament_teams, tournaments in supabase_realtime publication) and invalidate the board/tournament query keys on any change — spectators see results live without reloading; keep subscriptions inside useEffect with removeChannel cleanup.
- Pool standings add only the loser's remaining points (winner takes none); fewer points ranks higher. The main bracket, small_final match (stage "small_final", semi-final losers, 3rd place) and, when the tournament's consolation flag is on, consolation bracket (stage "consolation", non-qualifiers) are generated automatically by generateFinalsIfPoolsDone as soon as the last pool match result is saved — no admin button; all single-leg except the main bracket's two winning legs.
