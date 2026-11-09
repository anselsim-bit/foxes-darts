import { afterEach, describe, expect, it, vi } from "vitest";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

afterEach(() => vi.unstubAllEnvs());

describe("Scheduled import authentication", () => {
  it("rejects an arbitrary bearer token rather than only checking its presence", async () => {
    vi.stubEnv("LOVABLE_CRON_SECRET", "test-current-secret");
    vi.stubEnv("LOVABLE_CRON_SECRET_PREVIOUS", "");
    const response = await authenticateCronRequest(new Request("https://example.test", {
      headers: { authorization: "Bearer arbitrary-token" },
    }));
    expect(response?.status).toBe(401);
  });

  it("accepts the current scheduled-import secret", async () => {
    vi.stubEnv("LOVABLE_CRON_SECRET", "test-current-secret");
    vi.stubEnv("LOVABLE_CRON_SECRET_PREVIOUS", "");
    expect(await authenticateCronRequest(new Request("https://example.test", {
      headers: { authorization: "Bearer test-current-secret" },
    }))).toBeNull();
  });

  it("accepts only the configured previous secret during rotation", async () => {
    vi.stubEnv("LOVABLE_CRON_SECRET", "test-current-secret");
    vi.stubEnv("LOVABLE_CRON_SECRET_PREVIOUS", "test-previous-secret");
    expect(await authenticateCronRequest(new Request("https://example.test", {
      headers: { authorization: "Bearer test-previous-secret" },
    }))).toBeNull();
  });

  it("rejects missing credentials", async () => {
    vi.stubEnv("LOVABLE_CRON_SECRET", "test-current-secret");
    expect((await authenticateCronRequest(new Request("https://example.test")))?.status).toBe(401);
  });

  it("fails closed when the server secret is absent", async () => {
    vi.stubEnv("LOVABLE_CRON_SECRET", "");
    expect((await authenticateCronRequest(new Request("https://example.test")))?.status).toBe(500);
  });
});