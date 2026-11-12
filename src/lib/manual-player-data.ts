import { validateGuest } from "./player.functions";

export type ManualPlayerInput = {
  tournamentId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  partnerFirstName?: string;
  partnerLastName?: string;
  teamName?: string;
};

export function validateManualPlayers(input: ManualPlayerInput, doublette: boolean) {
  const contact = validateGuest({ ...input, ...(!doublette ? { partnerFirstName: "", partnerLastName: "", teamName: "" } : {}) });
  if (doublette && (!contact.partnerFirstName || !contact.partnerLastName)) throw new Error("Indiquez le prénom et le nom du second joueur.");
  return contact;
}