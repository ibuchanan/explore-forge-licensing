import { err, ok, type Result } from "@forge-ahead/errors";

export type LicenseState = "active" | "trial" | "inactive" | "missing";
export type LicenseStatus = {
  source: "api" | "override" | "context";
  active: boolean;
  state: LicenseState;
};

type LicenseResponse = {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
};
type RequestLicense = (
  path: string,
  options: { method: string },
) => Promise<LicenseResponse>;

export async function getLicenseStatus(
  request: RequestLicense,
  override: string | undefined,
): Promise<Result<LicenseStatus, string>> {
  if (override !== undefined) {
    if (!["active", "trial", "inactive", "missing"].includes(override)) {
      return err("Invalid license override");
    }
    return ok({
      source: "override",
      active: override === "active" || override === "trial",
      state: override as LicenseState,
    });
  }

  try {
    const response = await request("/forge/app/v1/license", { method: "GET" });
    if (!response.ok) return err(`License API returned ${response.status}`);
    const payload = (await response.json()) as {
      results?: Array<{
        data?: { active?: boolean; isEvaluation?: boolean };
        error?: unknown;
      }>;
    };
    const entry = payload.results?.[0];
    if (!entry || entry.error)
      return err("License API did not return a license result");
    const state = entry.data?.active
      ? entry.data.isEvaluation
        ? "trial"
        : "active"
      : entry.data?.active === false
        ? "inactive"
        : "missing";
    return ok({
      source: "api",
      active: state === "trial" || state === "active",
      state,
    });
  } catch {
    return err("License API request failed");
  }
}
