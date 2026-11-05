import React, { useEffect, useState } from "react";
import ForgeReconciler, {
  Heading,
  Link,
  SectionMessage,
  Spinner,
  Stack,
  Text,
  useProductContext,
} from "@forge/react";
import { invoke } from "@forge/bridge";
import type { LicenseStatus } from "./licensing";

type Response = { license?: LicenseStatus; error?: string };

function LicenseView({ license }: { license: LicenseStatus }) {
  return (
    <SectionMessage
      appearance={license.active ? "success" : "warning"}
      title={`License: ${license.state}`}
    >
      <Text>{`Access: ${license.active ? "enabled" : "blocked"}. Source: ${license.source}.`}</Text>
    </SectionMessage>
  );
}

function App() {
  const context = useProductContext();
  const moduleKey = context?.moduleKey;
  const isPanel = moduleKey === "license-issue-panel";
  const [data, setData] = useState<Response | null>(null);
  useEffect(() => {
    if (!moduleKey || isPanel) return;
    let mounted = true;
    invoke("getLicense")
      .then((value) => {
        if (mounted) setData(value as Response);
      })
      .catch(() => {
        if (mounted) setData({ error: "License check failed" });
      });
    return () => {
      mounted = false;
    };
  }, [isPanel, moduleKey]);

  const panelLicense = context?.license;
  const panelStatus: LicenseStatus | undefined = panelLicense && {
    source: "context",
    active: panelLicense.active,
    state: panelLicense.active
      ? panelLicense.isEvaluation
        ? "trial"
        : "active"
      : "inactive",
  };
  const license = isPanel ? panelStatus : data?.license;
  return (
    <Stack space="space.200">
      {!isPanel && (
        <Heading as="h1" size="large">
          Explore Forge licensing
        </Heading>
      )}
      {!context || (!isPanel && !data) ? (
        <Spinner label="Checking license" />
      ) : license ? (
        <LicenseView license={license} />
      ) : (
        <SectionMessage
          appearance={data?.error ? "error" : "information"}
          title={
            data?.error ? "License unavailable" : "No frontend license context"
          }
        >
          <Text>
            {data?.error ??
              "Forge may omit license context outside a paid production installation."}
          </Text>
        </SectionMessage>
      )}
      {context?.moduleKey === "license-admin-page" && (
        <Text>
          To purchase or manage this app, open Jira administration, then Apps,
          Manage apps, and find Explore Forge Licensing.
        </Text>
      )}
      {isPanel && license && !license.active && (
        <Text>An issue panel can hide licensed features in this state.</Text>
      )}
      {context?.moduleKey === "license-global-page" &&
        license &&
        !license.active && (
          <Text>
            Backend features must check the license in the resolver before
            running.
          </Text>
        )}
      <Text>
        <Link
          href="https://developer.atlassian.com/platform/forge/apis-reference/license-api/"
          openNewTab
        >
          Forge License API reference
        </Link>
      </Text>
    </Stack>
  );
}

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
