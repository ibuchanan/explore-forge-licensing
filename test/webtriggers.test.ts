import { describe, expect, it, vi } from "vitest";
import { createWebtriggers } from "../src/webtriggers";

const request = (method: string, body?: unknown) => ({
  method,
  body: JSON.stringify(body),
});
const status = {
  source: "api" as const,
  active: true,
  state: "active" as const,
};

describe("public webtrigger boundaries", () => {
  it("returns a working JSON response when licensed", async () => {
    const handlers = createWebtriggers({
      getStatus: vi
        .fn()
        .mockResolvedValue({ isErr: () => false, value: status }),
      setOverride: vi.fn(),
    });
    const response = await handlers.filtered(request("GET"));
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      license: status,
      message: "Licensed webtrigger invoked",
    });
  });

  it("blocks unlicensed requests without claiming a platform filter", async () => {
    const handlers = createWebtriggers({
      getStatus: vi.fn().mockResolvedValue({
        isErr: () => false,
        value: { source: "api", active: false, state: "inactive" },
      }),
      setOverride: vi.fn(),
    });
    expect((await handlers.filtered(request("GET"))).statusCode).toBe(403);
  });

  it("exposes an unfiltered JSON-RPC state control and probe", async () => {
    let override: string | null = null;
    const handlers = createWebtriggers({
      getStatus: vi.fn().mockImplementation(async () => ({
        isErr: () => false,
        value: {
          source: "override",
          active: override === "trial",
          state: override ?? "missing",
        },
      })),
      setOverride: vi.fn().mockImplementation(async (value) => {
        override = value;
      }),
    });
    expect(
      JSON.parse(
        (
          await handlers.rpc(
            request("POST", {
              jsonrpc: "2.0",
              id: 1,
              method: "license.setOverride",
              params: { state: "trial" },
            }),
          )
        ).body,
      ).result,
    ).toEqual({ state: "trial" });
    expect(
      JSON.parse(
        (
          await handlers.rpc(
            request("POST", { jsonrpc: "2.0", id: 2, method: "license.probe" }),
          )
        ).body,
      ).result.state,
    ).toBe("trial");
  });

  it("rejects invalid overrides rather than silently enabling access", async () => {
    const setOverride = vi.fn();
    const handlers = createWebtriggers({ getStatus: vi.fn(), setOverride });
    const response = await handlers.rpc(
      request("POST", {
        jsonrpc: "2.0",
        id: 5,
        method: "license.setOverride",
        params: { state: "anything" },
      }),
    );
    expect(JSON.parse(response.body).error.code).toBe(-32602);
    expect(setOverride).not.toHaveBeenCalled();
  });
});
