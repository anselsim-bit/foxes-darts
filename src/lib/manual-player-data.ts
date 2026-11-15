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
  const text = (value?: string) => String(value ?? "").trim().replace(/\s+/g, " ");
  const firstName = text(input.firstName);
  const lastName = text(input.lastName);
  const partnerFirstName = doublette ? text(input.partnerFirstName) : "";
  const partnerLastName = doublette ? text(input.partnerLastName) : "";
  const teamName = doublette ? text(input.teamName) : "";
  const email = text(input.email).toLowerCase();
  const phone = text(input.phone).replace(/[\s().-]/g, "");
  if ([firstName, lastName, partnerFirstName, partnerLastName, teamName].some(value => value.length > 60)) throw new Error("Les noms sont limités à 60 caractères.");
  if (email && (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new Error("Adresse e-mail invalide.");
  if (phone && !/^\+?\d{9,15}$/.test(phone)) throw new Error("Numéro de téléphone invalide.");
  return { firstName, lastName, email, phone, partnerFirstName, partnerLastName, teamName };
}