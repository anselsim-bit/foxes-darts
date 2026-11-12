/** A linked ticket office owns player self-registration; manual organizer additions are separate. */
export function allowsFoxesRegistration(helloassoUrl: string | null | undefined) {
  return !helloassoUrl?.trim();
}