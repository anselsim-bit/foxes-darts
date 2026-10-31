import { z } from "zod";

const dartSchema = z.object({ label: z.string(), value: z.number().int().min(0).max(60), isDouble: z.boolean() });
export const gameProgressSchema = z.object({
  turns: z.array(z.object({ player: z.number().int().min(0).max(1), darts: z.array(dartSchema).max(3), bust: z.boolean(), total: z.number().int().min(0).max(180) })),
  current: z.array(dartSchema).max(3),
  pendingBust: z.boolean().nullable(),
  mult: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  completedLegs: z.array(z.object({ winner: z.number().int().min(0).max(1), remaining: z.number().int().min(1), turns: z.array(z.object({ player: z.number().int().min(0).max(1), darts: z.array(dartSchema).max(3), bust: z.boolean(), total: z.number().int().min(0).max(180) })).optional() })).max(2).optional(),
});
export type GameProgress = z.infer<typeof gameProgressSchema>;
const draftSchema = z.object({
  version: z.literal(1), matchId: z.string(), teamAId: z.string(), teamBId: z.string(),
  start: z.number(), doubleOut: z.boolean(), poolDoubleLimit: z.boolean(),
  legsToWin: z.number().int().min(1).max(2).optional(),
  players: z.array(z.object({ name: z.string(), userId: z.null() })).length(2),
  progress: gameProgressSchema,
});
export type TournamentDraft = z.infer<typeof draftSchema>;
export const deviceCodeKey = (id: string) => `foxes:tournament:${id}:code`;
export const deviceDraftKey = (id: string) => `foxes:tournament:${id}:draft`;
export function readDeviceCode(id: string) {
  try { return localStorage.getItem(deviceCodeKey(id)); } catch { return null; }
}
export function readTournamentDraft(id: string): TournamentDraft | null {
  try {
    const parsed = draftSchema.safeParse(JSON.parse(localStorage.getItem(deviceDraftKey(id)) ?? "null"));
    return parsed.success ? parsed.data : null;
  } catch { return null; }
}
export function writeDeviceValue(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
    return true;
  } catch { return false; }
}
export function draftMatches(draft: TournamentDraft, match: { id: string; teamAId: string; teamBId: string; teamA: string; teamB: string; start: number; doubleOut: boolean; poolDoubleLimit: boolean; legsToWin?: number }) {
  return draft.matchId === match.id && draft.teamAId === match.teamAId && draft.teamBId === match.teamBId
    && draft.start === match.start && draft.doubleOut === match.doubleOut && draft.poolDoubleLimit === match.poolDoubleLimit
    && (draft.legsToWin ?? 1) === (match.legsToWin ?? 1)
    && draft.players.some(p => p.name === match.teamA) && draft.players.some(p => p.name === match.teamB);
}