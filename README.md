# Explore Forge licensing

A Forge demo of license states in a Jira admin page, issue panel, global page,
and two webtriggers. The issue panel reads frontend license context. The pages
use a resolver that calls the
[Forge License API](https://developer.atlassian.com/platform/forge/apis-reference/license-api/).
Successful API reads are cached for one hour to respect its rate limit.

**Development-only:** The JSON-RPC webtrigger is public and can set a site-wide
demo override. Do not share its URL with untrusted users or deploy this demo in
production. Overrides affect only this app, not the Marketplace license. The
issue panel uses Forge frontend context, not the backend override. Forge may
omit license context for unlisted apps or outside paid production installations.

## Try it

See [development setup](DEVELOPMENT.md) for deployment prerequisites. On a test
site, open the three Jira app locations. To test platform-provided states, use
the Forge CLI `install --license active|inactive|trial` option when installing
or upgrading. See the
[Forge install reference](https://developer.atlassian.com/platform/forge/cli-reference/install/).

For backend-only simulation, set the Forge runtime variable `LICENSE_OVERRIDE`
to `active`, `trial`, `inactive`, or `missing`, then redeploy. Alternatively,
obtain the `license-json-rpc` webtrigger URL and POST JSON-RPC 2.0 requests:

```json
{"jsonrpc":"2.0","id":1,"method":"license.setOverride","params":{"state":"inactive"}}
```

`state: null` clears the persisted override and falls back to
`LICENSE_OVERRIDE`, then to the real License API. `license.probe` reads the
effective backend state:

```json
{"jsonrpc":"2.0","id":2,"method":"license.probe"}
```

The `license-filtered-trigger` URL returns HTTP 403 when inactive or missing,
HTTP 503 when lookup fails, and HTTP 200 when active or trial. Forge does
**not** support `filter.appIsLicensed` on webtriggers (only on event and
scheduled triggers), so this demo checks the license in its handler instead.
The public webtrigger URL is not an authorization mechanism.

## Verify locally

```sh
npm run check
```

Vitest covers API parsing, overrides, and webtrigger responses, not behavior
on a Forge installation. Local checks do not deploy or install the app.

See [CONTRIBUTING.md](CONTRIBUTING.md). Licensed under [Apache 2.0](LICENSE).
