import type { Result } from "@forge-ahead/errors";
import type { LicenseStatus, LicenseState } from "./licensing";

type Request = { method: string; body?: string };
type Response = {
  statusCode: number;
  headers: { "Content-Type": string[] };
  body: string;
};
type Dependencies = {
  getStatus(): Promise<Result<LicenseStatus, string>>;
  setOverride(state: LicenseState | null): Promise<void>;
};
const json = (statusCode: number, body: unknown): Response => ({
  statusCode,
  headers: { "Content-Type": ["application/json"] },
  body: JSON.stringify(body),
});

export function createWebtriggers({ getStatus, setOverride }: Dependencies) {
  return {
    async filtered(_request: Request): Promise<Response> {
      const result = await getStatus();
      if (result.isErr()) return json(503, { error: result.error });
      if (!result.value.active)
        return json(403, {
          error: "App is not licensed",
          license: result.value,
        });
      return json(200, {
        license: result.value,
        message: "Licensed webtrigger invoked",
      });
    },
    async rpc(request: Request): Promise<Response> {
      if (request.method !== "POST")
        return json(405, {
          jsonrpc: "2.0",
          id: null,
          error: { code: -32600, message: "POST required" },
        });
      let input: unknown;
      try {
        input = JSON.parse(request.body ?? "");
      } catch {
        return json(200, {
          jsonrpc: "2.0",
          id: null,
          error: { code: -32700, message: "Parse error" },
        });
      }
      const id =
        typeof input === "object" &&
        input !== null &&
        "id" in input &&
        (typeof input.id === "string" ||
          typeof input.id === "number" ||
          input.id === null)
          ? input.id
          : null;
      const error = (code: number, message: string) =>
        json(200, { jsonrpc: "2.0", id, error: { code, message } });
      if (
        !input ||
        typeof input !== "object" ||
        !("jsonrpc" in input) ||
        input.jsonrpc !== "2.0" ||
        !("method" in input) ||
        typeof input.method !== "string"
      )
        return error(-32600, "Invalid request");
      if (input.method === "license.setOverride") {
        const params = "params" in input ? input.params : undefined;
        const state =
          params && typeof params === "object" && "state" in params
            ? params.state
            : undefined;
        if (
          state !== null &&
          state !== "active" &&
          state !== "trial" &&
          state !== "inactive" &&
          state !== "missing"
        )
          return error(
            -32602,
            "Expected state: active, trial, inactive, missing or null",
          );
        try {
          await setOverride(state);
          return json(200, { jsonrpc: "2.0", id, result: { state } });
        } catch {
          return error(-32603, "Unable to save override");
        }
      }
      if (input.method === "license.probe") {
        const result = await getStatus();
        return result.isErr()
          ? error(-32603, result.error)
          : json(200, { jsonrpc: "2.0", id, result: result.value });
      }
      return error(-32601, "Method not found");
    },
  };
}
