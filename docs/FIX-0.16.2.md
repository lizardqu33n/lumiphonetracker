# Setup model request fix - 0.16.2

## What went wrong

The reported messages were:

- Phone: `The selected connection failed. Nothing was saved.`
- Server console: `Lumi Phone Tracker: setup request failed; check saved state.`

Both were generic messages from the extension, not the upstream error. They do not
prove the exact live provider failure. No real server log or provider response was
available beyond those messages.

A concrete request bug was found: setup counted tokens for the selected model and
stored it in the temporary review ticket, but omitted that model in generate.raw.
The local Lumiverse 1.2.5 worker forwards an omitted model as an empty string. Its
raw-generation implementation uses connection_id for credentials/provider but uses
the explicit input.model for the request. Providers can reject that empty model.

The mock now rejects that omission. Before the fix, six setup tests failed, showing
the same generic connection-failed message. After the fix the reviewed model is
sent alongside connection_id and the trusted userId. Background Custom connection
tracking had the same omission and receives the same correction. No keys are read
or stored. Model information was already transient in the review ticket; there is
no new persistent setting.

## API documentation and types discrepancy

The official [generation documentation](https://docs.lumiverse.chat/backend-api/generation/)
shows model in raw-generation examples. The installed lumiverse-spindle-types
0.6.77 also shows it in examples, but omits model from GenerationRequestDTO's declared
fields. The local host explicitly reads input.model and forwards it to rawGenerate.
We retain the SDK type and pass a structural subtype with the documented model field;
we do not invent a method, widen the SDK itself, or switch to preset-based quiet
assembly. No provider name/key needs to be supplied when using connection_id.

This discrepancy should be checked again when upgrading the host/types. The local
checkout is evidence about version 1.2.5, not proof that the remote server is running
identical code.

## Safe failure handling

Provider exceptions are classified, not copied into the phone or server console:
permission missing, provider error or timeout. Empty reply and invalid output are
separate categories; source validation and revision conflicts remain protected. A
failed post-request state read has a separate state-unavailable category. There is
no retry and no write before confirmation. Raw story, field values, model names,
credentials and provider exception bodies stay out of these logs.

A continued Provider error still needs real-install investigation; this update does
not claim the provider request succeeded on the user's server. Existing ticket,
source/revision checks, preview, cost review and manual Save remain required.

## Verification

Tests enforce trusted user IDs and a nonempty raw model; they cover default/custom
connection selection, the reviewed model, safe failure categories, log redaction,
empty/malformed replies, no retries, no saved additions on failure and the real
backend RPC path. The browser harness also rejects setup requests without a model.

Real server permission grants, native card/persona/lorebook access, provider behavior,
billing and mobile drawer behavior remain unverified. No paid requests were made.
