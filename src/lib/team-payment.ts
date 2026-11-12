export function teamIsPaid(helloassoItemId: number | null, manualPaid = false): boolean {
  return helloassoItemId !== null || manualPaid;
}