import { describe, expect, it, vi } from "vitest";
import { getLicenseStatus } from "../src/licensing";
import { expectOk } from "@forge-ahead/errors/testing";

describe("getLicenseStatus", () => {
  it("reports an active trial from the real self-license API response", async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            appId: "app-id",
            data: { active: true, isEvaluation: true, type: "commercial" },
          },
        ],
      }),
    });

    expect(expectOk(await getLicenseStatus(request, undefined))).toEqual({
      source: "api",
      active: true,
      state: "trial",
    });
    expect(request).toHaveBeenCalledWith("/forge/app/v1/license", {
      method: "GET",
    });
  });

  it("uses an explicit override without querying the API", async () => {
    const request = vi.fn();
    expect(expectOk(await getLicenseStatus(request, "inactive"))).toEqual({
      source: "override",
      active: false,
      state: "inactive",
    });
    expect(request).not.toHaveBeenCalled();
  });

  it("does not treat API failure as an unlicensed state", async () => {
    const result = await getLicenseStatus(
      vi.fn().mockResolvedValue({ ok: false, status: 429 }),
      undefined,
    );
    expect(result.isErr()).toBe(true);
  });
});
