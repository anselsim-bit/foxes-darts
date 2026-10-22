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
- Tournament participants live in tournament_teams (capacity enforced by DB trigger); brackets are generated server-side from pure logic in src/lib/bracket.ts — keeps the rules testable and the limit tamper-proof.
- Tournament list reads return aggregate team counts only; shared display helpers and cards drive home and tournament categories so capacity labels and lifecycle grouping stay consistent without exposing participant identities.
- The home category carousel uses native CSS scroll snapping and app-owned React refs rather than an external React carousel hook to avoid dependency dispatcher mismatches and preserve touch navigation.
- Tournament access: public code-only endpoints validate the current admin-set code and started status for match listing and reporting; authenticated endpoints alone remember member claims, modify teams, or manage codes; emails carry only the play link (tournament_access_codes is deprecated) — allows guests to play without granting member or admin privileges.
- Tournament match settings come from persisted admin settings; dart-rules.ts replays visits to derive per-team checkout limits, shared by the scoreboard and tests — keeps undo, busts, advice and checkout validation consistent.
