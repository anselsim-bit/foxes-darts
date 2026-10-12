import { describe, expect, it } from "vitest";
import { isTournamentFull, tournamentCategory } from "./tournament-display";

describe("tournament card rules", () => {
  it("marks a tournament full at its 16-team capacity", () => {
    expect(isTournamentFull({ max_participants: 16, registrations_count: 16 })).toBe(true);
    expect(isTournamentFull({ max_participants: 16, registrations_count: 15 })).toBe(false);
    expect(isTournamentFull({ max_participants: null, registrations_count: 16 })).toBe(false);
  });
  it("keeps a started tournament in progress regardless of its date", () => {
    expect(tournamentCategory({ status: "started", event_date: "2026-10-01" }, "2026-10-12")).toBe("ongoing");
  });
  it("places a completed tournament in the finished section even before its planned date", () => {
    expect(tournamentCategory({ status: "finished", event_date: "2026-10-20" }, "2026-10-12")).toBe("finished");
  });
  it("separates upcoming and past unstarted tournaments", () => {
    expect(tournamentCategory({ status: "open", event_date: "2026-10-12" }, "2026-10-12")).toBe("upcoming");
    expect(tournamentCategory({ status: "open", event_date: "2026-10-11" }, "2026-10-12")).toBe("finished");
  });
});