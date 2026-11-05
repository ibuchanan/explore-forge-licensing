# Explore Forge App Licensing

The appeal of building Forge for Atlassian Marketplace
is that Atlassian provides a licensing and billing model.
However, that leaves app builders to work out
how their app should behave in the various licensing states,
and then to test how it actually behaves.

- https://developer.atlassian.com/platform/forge/apis-reference/license-api/
- https://developer.atlassian.com/platform/marketplace/listing-forge-apps/
- https://community.developer.atlassian.com/t/testing-licensing-in-forge-apps/56115

## Make licensing visible for app builders

This app has a simple core UI component
that shows the current licensing state.
That component appears in the following locations:

- Jira admin page where the app can give instructions about purchasing
- Jira issue panel (frontend only) where the app might hide itself when not licensed
- Jira global page (with resolver) where backend features might be blocked

The app has a filtered webtrigger using `filter.appIsLicensed: true`
so that app builders can see what external clients receive when unlicensed.

The app demonstrates a real call to the licensing API.
That means using the Forge CLI to "fake" license states:
https://developer.atlassian.com/platform/marketplace/listing-forge-apps/#testing-your-app-with-different-license-states

The app also demonstrates how to use the implied suggestion
on that page to use an environment variable for more control over testing.

The app has an unfiltered JSON-RPC webtrigger endpoint
for setting state and probing licensing
(for example, as a seam for integration testing).

## Development guidance

The app uses a functional style of `Results`
from `@forge-ahead/errors` for error management.
The app has a structured logging layer
provided by `@forge-ahead/logging`
that instruments key points in the app
using the extended "demo" semantics.
