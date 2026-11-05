import { asApp, route } from "@forge/api";
import { kvs } from "@forge/kvs";
import Resolver from "@forge/resolver";
import { createForgeLogger } from "@forge-ahead/logging";
import { createDemoNarrative } from "@forge-ahead/logging/demo";
import { ok } from "@forge-ahead/errors";
import { getLicenseStatus, type LicenseStatus } from "./licensing";
import { createWebtriggers } from "./webtriggers";

const logger = createForgeLogger({ name: "explore-forge-licensing" });
const story = createDemoNarrative(logger, { storyId: "license-check" });
const key = "demo-license-override";

async function status() {
  const override =
    (await kvs.get<string>(key)) ?? process.env["LICENSE_OVERRIDE"];
  story.step("Checking license state", { override: override ?? "none" });
  if (override === undefined) {
    const cached = await kvs.get<LicenseStatus>("license-api-cache");
    if (cached) return ok(cached);
  }
  const result = await getLicenseStatus(
    (_path, options) =>
      asApp().requestAtlassian(route`/forge/app/v1/license`, options),
    override,
  );
  if (override === undefined && result.isOk())
    await kvs.set("license-api-cache", result.value, {
      ttl: { value: 1, unit: "HOURS" },
    });
  story.step("License check completed", {
    success: result.isOk(),
    state: result.isOk() ? result.value.state : "error",
  });
  return result;
}

const triggers = createWebtriggers({
  getStatus: status,
  setOverride: async (state) => {
    if (state === null) await kvs.delete(key);
    else await kvs.set(key, state);
    story.step("Demo license override changed", { state: state ?? "cleared" });
  },
});

export const licensedTrigger = triggers.filtered;
export const jsonRpcTrigger = triggers.rpc;

const resolver = new Resolver();
resolver.define("getLicense", async () => {
  const result = await status();
  return result.match(
    (license) => ({ license }),
    (error) => ({ error }),
  );
});
export const handler = resolver.getDefinitions();
