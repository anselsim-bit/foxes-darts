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
