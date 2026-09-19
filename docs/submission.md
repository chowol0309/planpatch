# Devpost submission draft — not submitted

The edited public story is in [devpost-story.md](devpost-story.md). The title, pitch, story, repository link, Alexa+ track, tool feedback, three screenshots and video link have been saved to Devpost draft 1189906. Final submission is still pending.

Demo video: https://youtu.be/t9wYuDp0zuA — published publicly on September 20, 2026. It is an edited walkthrough of actual browser captures from the running local app, with English captions.

## Project name
PlanPatch

## Elevator pitch
When a shift changes, recover the whole household day: feasible handoffs, travel-aware scheduling, explicit tradeoffs, and approval before any local change.

## Inspiration
A reminder can tell a parent that school pickup is due. It cannot explain who can take over when work suddenly changes, whether they can travel there in time, and which other tasks must move. We built a small, inspectable recovery workflow for that moment.

## What it does
PlanPatch reads a fictional household's shared tasks and availability. Given an unexpected same-day unavailability, it computes feasible alternatives while respecting fixed commitments, travel buffers, per-person workload, helper permission and budget. Essential tasks cannot silently disappear; optional deferrals are visible. The person reviews the exact before/after changes, then applies the chosen plan to local demo state. Saved changes survive refresh and server restart. One-step undo restores the previous state.

## How we built it
A Node.js constraint solver enumerates candidate schedules. The official Model Context Protocol TypeScript SDK exposes a working MCP 2025-11-25 Streamable HTTP server. Its tools read the household, generate a recovery preview and inspect an existing preview. A separate HTML/CSS/JavaScript web interface reviews and applies those proposals. JSON state uses atomic replacement and monotonic revisions so a stale preview cannot overwrite a newer plan.

The intended Alexa+ entry route is the working self-hosted MCP server. We have not connected a live Alexa+ device or used a private Alexa+ preview. The web interface and SDK-client demo use the same local scheduler. The fixtures, helper prices and schedules are synthetic. No real calendars, messages, purchases or bookings are changed.

## Challenges
Feasible recovery is not just moving overlapping tasks: travel before a fixed appointment and maximum workload can invalidate a visually plausible schedule. A second challenge was ensuring that an assistant's proposal did not become a silent write. We split proposal tools from the local approval UI, versioned proposals, and tested stale approval rejection.

## Accomplishments
- Working Streamable HTTP MCP endpoint exercised by an SDK client.
- Multiple computed alternatives with visible tradeoffs.
- Local persistence, review, approval and one-step undo.
- Tests covering both successful and impossible recovery and the real HTTP/protocol boundary.

## What we learned
Explicit constraints and visible deferrals make a recovery plan easier to assess. A model does not need permission to write to calendars in order to help a person explore alternatives. Small reproducible fixtures also make orchestration errors much easier to test.

## What's next
User research with households affected by changing shifts; calendar import; participant acceptance of handoffs; actual client/voice integration; multi-day support. These are future work, not current features or validated demand.

## Built with
JavaScript, Node.js, Express, Zod, Model Context Protocol TypeScript SDK, HTML, CSS.

## Track
Alexa+ only. No Open Source or AWS Builder mini-challenge claim at this stage. The updated rules require an additional open-source contribution, and no AWS integration was used.

## Product feedback
**MCP TypeScript SDK 1.30.0:** Used McpServer, registerTool, the SDK's Express application factory and StreamableHTTPServerTransport; used the matching SDK client in an integration test and reproducible command-line demo. The stateless server example made the first endpoint straightforward. The SDK's host validation protected the local endpoint in a raw HTTP test. During implementation, Node fetch normalized the Host header, so the test was corrected to send an actual raw HTTP request rather than falsely concluding that host validation failed. This was a test-harness issue, not an SDK defect.

**Express:** Used for static assets and local review endpoints. Straightforward routing let protocol calls and the UI share the same planner/store. No production deployment or scaling claim is made.

**Zod:** Used for tool parameters and same-day time/budget validation. Invalid/overnight ranges are rejected explicitly.

**Would we build again?** Yes, the open MCP interface makes the project portable across compatible clients. This is not feedback claiming real Alexa+ onboarding or device integration.

## Public repository
https://github.com/chowol0309/planpatch — published and verified public, MIT licensed.

## Submission prerequisites still outstanding
- Hackathon registration and project draft creation are complete. CAPTCHA was completed by the entrant.
- Final accuracy review and action-time acceptance of the contest rules.
- Entrant eligibility/conflict-of-interest declarations must be truthful; do not guess undisclosed facts.
