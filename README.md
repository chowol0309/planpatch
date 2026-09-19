# PlanPatch

**One changed shift. A workable household day.**

PlanPatch is an independent prototype for the Alexa+ track of the **Build, Ship, Shape: Amazon Developer Hackathon 2026**. It implements a functioning MCP **2025-11-25 Streamable HTTP** server and a local approval/review web application. It is not an official Amazon product or a live Alexa+ integration.

![PlanPatch local demo](docs/overview.png)

## The problem

An unexpected work shift can break school pickup, grocery collection and dinner preparation at once. A list of reminders doesn't answer who can actually take over, how they get there, or what should wait until tomorrow.

PlanPatch checks the whole day and proposes a small set of feasible recovery plans. It preserves fixed commitments, checks travel buffers and per-person workload, respects a helper budget, and explicitly defers optional tasks when necessary. If essential work cannot be covered, it says so instead of inventing an available helper.

## Run locally — no API key or subscription

Requires Node.js 22 or newer and npm.

```sh
npm ci
npm test
npm start
```

Open http://127.0.0.1:4178 . The app binds to loopback only. All people, schedules and dollar amounts are fictional demonstration data. There is no email, calendar, payment or booking integration and no paid service call.

### Try the web demo

1. Keep Alex unavailable from 14:00–20:00, budget $0, helper disabled.
2. Choose **Find a recovery plan**. Essential pickup and dinner move to Casey; laundry can move to Alex after work and the travel buffer. Review the actual computed result.
3. Compare alternatives. Generating a preview leaves the saved schedule unchanged.
4. Check the review box and choose **Apply this plan to demo**. Refresh the page: the change persists.
5. Choose **Undo last applied plan** to restore the previous schedule.
6. Reset, then use 14:00–23:00: the limited household workload requires an explicit deferral. Enable Jo and a $12 budget to compare a paid-helper scenario; this represents a fictional arrangement, not a real booking.

### Try the actual MCP endpoint

With `npm start` running, use another terminal:

```sh
npm run demo:mcp
```

This SDK client performs a real protocol handshake and real `get_household` and `preview_recovery` calls. It is a **scripted protocol demonstration, not an LLM**. In the browser choose **Review assistant proposal** to inspect the saved MCP preview.

For an MCP client that supports local Streamable HTTP, configure:

```json
{ "mcpServers": { "planpatch": { "url": "http://127.0.0.1:4178/mcp" } } }
```

Client configuration formats vary. A remote/cloud client cannot reach your loopback address. Do not expose this demonstration server publicly; multi-user authentication is not implemented.

Tools:
- `get_household`: read fictional tasks, availability and the current saved schedule.
- `preview_recovery`: compute alternatives and persist a proposal; does **not** change assignments.
- `get_recovery_plan`: inspect a saved proposal and its base revision.

There is deliberately no MCP tool for applying plans. The web UI requires a reviewed selection. The UI mutation routes require a session token and reject cross-origin requests. These are local-demo boundaries, not a claim that another process running as the user is untrusted or isolated.

## Implementation

- **Planner:** exhaustive search over the small sample day's allowed time slots and assignees. Every candidate checks travel, overlap, fixed commitments, helper permission, budget, essential tasks and workload. Scoring uses explicit heuristic penalties (deferral, cost, reassignment and time changes), not learned preferences.
- **State:** atomic JSON writes under `.data/`, monotonic revisions, 30-minute preview expiry, stale/replayed approval rejection and one-step undo. Single-process demonstration only.
- **Protocol:** official `@modelcontextprotocol/sdk` 1.30.0, stateless Streamable HTTP and shared application state. SDK client integration test exercises the actual endpoint.
- **UI:** dependency-free HTML/CSS/JavaScript, keyboard-accessible controls, responsive layout and live activity panel. No remotely loaded fonts or art.

## Scope and honest limitations

- One sample day and four fixed task definitions. Same-day availability only; overnight/multiday planning is rejected, not supported.
- No language-model inference, speech recognition, real Alexa+ device test or calendar provider connection has been performed. The valid submission path intended here is the working MCP server, not a claim of deployed Alexa+ availability.
- Assignees' agreement is simulated. Approving a plan changes local demo data only. A real product would need participant permissions and actual acceptance of handoffs.
- Travel durations, work limits and helper rates are illustrative constants, not maps, payroll or verified real-world facts.
- No claim of adoption, revenue, user research or production security.

## Validation

`npm test` covers feasible and impossible recovery, deferral, travel buffers, helper budget/permission, invalid times, expiry, persistence, stale previews, undo, a real MCP handshake/tool call, origin/Host validation and the UI approval route. See `docs/validation.md` for manual browser checks.

## Build disclosure and attribution

Created during the hackathon window, beginning September 20, 2026, with extensive AI assistance from OpenAI Codex. AI produced implementation, tests and draft documentation; no human-only development claim is made. User-facing design and all demonstration data were generated for this project. Dependencies: Model Context Protocol TypeScript SDK, Express and Zod; their licenses remain applicable. No third-party images, music or brand assets are bundled.

License: MIT. See LICENSE.
