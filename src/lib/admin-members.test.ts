import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ role: "ORGANIZATION_OWNER", from: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  const builder = { middleware: () => builder, inputValidator: () => builder, handler: (fn: unknown) => fn };
  return builder;
} }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/lib/organization-access", () => ({ requireCentralManager: async () => "foxes" }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: mocks.from } }));
import { adminSetMemberAdmin } from "./admin.functions";

function context() {
  const chain = { select: () => chain, eq: () => chain, maybeSingle: async () => ({ data: { role: mocks.role }, error: null }) };
  return { userId: "self", supabase: { from: () => chain } };
}
beforeEach(() => mocks.from.mockReset());
describe("historical member role safety", () => {
  it("prevents an administrator removing their own access", async () => {
    await expect(adminSetMemberAdmin({ data: { userId: "self", admin: false }, context: context() } as never)).rejects.toThrow("propres droits");
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("protects the organization owner from the legacy role editor", async () => {
    await expect(adminSetMemberAdmin({ data: { userId: "owner", admin: false }, context: context() } as never)).rejects.toThrow("propriétaire");
    expect(mocks.from).not.toHaveBeenCalled();
  });
});