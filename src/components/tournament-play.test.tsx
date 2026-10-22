import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TournamentPlay } from "./tournament-play";
import { deviceCodeKey, deviceDraftKey } from "@/lib/tournament-device";
import { listPlayableMatches, validateTournamentCode, reportTournamentMatch } from "@/lib/tournament.functions";

vi.mock("@/lib/tournament.functions", () => ({
  listPlayableMatches: vi.fn(), validateTournamentCode: vi.fn(), rememberTournamentCode: vi.fn(), getMyTournamentCode: vi.fn(), reportTournamentMatch: vi.fn(),
}));
vi.mock("@/lib/darts.functions", () => ({ saveGameResult: vi.fn() }));
vi.mock("sonner", () => ({ toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() } }));
const match = { id: "match-1", label: "A contre B", teamA: "A", teamB: "B", teamAId: "a", teamBId: "b", canNameA: false, canNameB: false, start: 501, doubleOut: true, poolDoubleLimit: true, legsToWin: 1 };
function open() { return render(<QueryClientProvider client={new QueryClient()}><TournamentPlay tournamentId="test" signedIn={false} /></QueryClientProvider>); }
async function begin() {
  open();
  fireEvent.change(await screen.findByRole("textbox", { name: "Code d'accès du tournoi" }), { target: { value: "FOXES" } });
  fireEvent.click(screen.getByRole("button", { name: "Valider" }));
  fireEvent.change(await screen.findByRole("combobox"), { target: { value: match.id } });
  fireEvent.click(screen.getByRole("button", { name: "A" }));
  fireEvent.click(screen.getByRole("button", { name: "Commencer le match" }));
}
const shoot = (n: number) => fireEvent.click(screen.getByRole("button", { name: n === 0 ? "Raté" : String(n) }));
beforeEach(() => {
  localStorage.clear(); vi.clearAllMocks();
  vi.mocked(validateTournamentCode).mockResolvedValue({ valid: true, active: true, participantName: null } as Awaited<ReturnType<typeof validateTournamentCode>>);
  vi.mocked(listPlayableMatches).mockResolvedValue([match]);
});
afterEach(cleanup);
describe("Tournament device recovery", () => {
  it("remembers a guest code and restores 444 remaining with the third dart pending handover", async () => {
    await begin(); shoot(20); shoot(19); shoot(18);
    expect(localStorage.getItem(deviceCodeKey("test"))).toBe("FOXES");
    cleanup(); open();
    expect(await screen.findByText("444")).toBeInTheDocument();
    expect(screen.getByText("S18")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(validateTournamentCode).toHaveBeenLastCalledWith({ data: { tournamentId: "test", code: "FOXES" } });
    fireEvent.click(screen.getByRole("button", { name: "Suivant" }));
    expect(screen.getByText("Au tour de", { exact: false })).toHaveTextContent("B");
    shoot(20); cleanup(); open();
    expect(await screen.findByText("481")).toBeInTheDocument();
    expect(screen.getByText("Au tour de", { exact: false })).toHaveTextContent("B");
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.queryByText("481")).not.toBeInTheDocument();
  });
  it("rejects an obsolete remembered code without losing the resumable match", async () => {
    await begin(); shoot(20); cleanup();
    vi.mocked(validateTournamentCode).mockResolvedValueOnce({ valid: false, active: false, participantName: null } as Awaited<ReturnType<typeof validateTournamentCode>>);
    open();
    expect(await screen.findByRole("textbox", { name: "Code d'accès du tournoi" })).toBeInTheDocument();
    expect(localStorage.getItem(deviceCodeKey("test"))).toBeNull();
    expect(localStorage.getItem(deviceDraftKey("test"))).not.toBeNull();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "NEWCODE" } });
    fireEvent.click(screen.getByRole("button", { name: "Valider" }));
    expect(await screen.findByText("481")).toBeInTheDocument();
  });
  it("does not resume a match already reported elsewhere", async () => {
    await begin(); shoot(20); cleanup();
    vi.mocked(listPlayableMatches).mockResolvedValue([]); open();
    await screen.findByText("Aucun match à jouer pour le moment.");
    expect(localStorage.getItem(deviceDraftKey("test"))).toBeNull();
  });
  it("keeps a completed game until reporting succeeds and then clears its draft", async () => {
    vi.mocked(listPlayableMatches).mockResolvedValue([{ ...match, start: 301, doubleOut: false, poolDoubleLimit: false }]);
    await begin();
    fireEvent.click(screen.getByRole("button", { name: "Triple" })); shoot(20);
    fireEvent.click(screen.getByRole("button", { name: "Triple" })); shoot(20);
    fireEvent.click(screen.getByRole("button", { name: "Triple" })); shoot(20);
    fireEvent.click(screen.getByRole("button", { name: "Suivant" }));
    shoot(0); shoot(0); shoot(0); fireEvent.click(screen.getByRole("button", { name: "Suivant" }));
    fireEvent.click(screen.getByRole("button", { name: "Triple" })); shoot(20);
    fireEvent.click(screen.getByRole("button", { name: "Triple" })); shoot(20); shoot(1);
    cleanup(); open();
    const report = await screen.findByRole("button", { name: "Envoyer le résultat au tableau du tournoi" });
    vi.mocked(reportTournamentMatch).mockResolvedValue({ ok: true } as Awaited<ReturnType<typeof reportTournamentMatch>>);
    fireEvent.click(report);
    await waitFor(() => expect(localStorage.getItem(deviceDraftKey("test"))).toBeNull());
    expect(reportTournamentMatch).toHaveBeenCalledWith({ data: { matchId: "match-1", scoreA: 0, scoreB: 301, code: "FOXES" } });
  });
});