import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Game } from "./dart-game";

vi.mock("@/lib/darts.functions", () => ({ saveGameResult: vi.fn() }));
vi.mock("@/lib/tournament.functions", () => ({ reportTournamentMatch: vi.fn() }));
vi.mock("sonner", () => ({ toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() } }));
afterEach(cleanup);

function startGame(count = 2, start = 301) {
  render(<Game players={[{ name: "Équipe A", userId: null }, { name: "Équipe B", userId: null }].slice(0, count)} start={start} doubleOut={false} canSave={false} tournamentId={null} match={null} accessCode={null} onExit={vi.fn()} />);
}
const shoot = (score: number) => fireEvent.click(screen.getByRole("button", { name: String(score) }));
const next = () => fireEvent.click(screen.getByRole("button", { name: "Suivant" }));

describe("Manual scoreboard handover", () => {
  it("keeps all three throws on the same player until Next, then clears them and advances", () => {
    startGame();
    shoot(20); shoot(19); shoot(18);
    expect(screen.getByText("S18")).toBeInTheDocument();
    expect(screen.getByText("244")).toBeInTheDocument();
    expect(screen.getByText("Au tour de", { exact: false })).toHaveTextContent("Équipe A");
    expect(screen.getByRole("button", { name: "20" })).toBeDisabled();
    next();
    expect(screen.getByText("Au tour de", { exact: false })).toHaveTextContent("Équipe B");
    expect(screen.queryByText("S18")).not.toBeInTheDocument();
    expect(screen.getByText("244")).toBeInTheDocument();
  });
  it("allows undoing the third throw before handing over", () => {
    startGame(); shoot(20); shoot(19); shoot(18);
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.queryByRole("button", { name: "Suivant" })).not.toBeInTheDocument();
    expect(screen.getByText("262")).toBeInTheDocument();
    shoot(17); next();
    expect(screen.getByText("245")).toBeInTheDocument();
  });
  it("starts a fresh visit for the same player in solo mode", () => {
    startGame(1); shoot(20); shoot(20); shoot(20); next();
    expect(screen.getByText("Au tour de", { exact: false })).toHaveTextContent("Équipe A");
    expect(screen.getByText("241")).toBeInTheDocument();
    expect(screen.queryByText("S20")).not.toBeInTheDocument();
  });
  it("retains a bust until Next without subtracting its score", () => {
    startGame(2, 30); shoot(20); shoot(20);
    expect(screen.getAllByText("30", { selector: "p" })).toHaveLength(2);
    expect(screen.getByText("Au tour de", { exact: false })).toHaveTextContent("Équipe A");
    next();
    expect(screen.getByText("Au tour de", { exact: false })).toHaveTextContent("Équipe B");
    expect(screen.getAllByText("30", { selector: "p" })).toHaveLength(2);
  });
  it("announces a winning throw immediately without requiring Next", () => {
    startGame(2, 20); shoot(20);
    expect(screen.getByText("gagne !", { exact: false })).toHaveTextContent("Équipe A");
    expect(screen.queryByRole("button", { name: "Suivant" })).not.toBeInTheDocument();
  });
});