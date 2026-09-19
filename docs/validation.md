# Validation — September 20, 2026

## Automated
Node.js v24.18.0, SDK 1.30.0. `npm test`: 8 tests pass.

- Zero-budget recovery: essential work covered, overlaps/travel/workload checked, preview leaves the schedule untouched.
- Late-night unavailability: explicit optional deferral when required by the constraints.
- Helper use requires permission and budget.
- Infeasible essential pickup returns no solution rather than a fabricated assignment.
- Travel buffer catches appointments with insufficient transfer time.
- Disk persistence, stale/replayed preview rejection and exact one-step undo.
- Invalid time ranges, overnight ranges, invalid budget and expired previews rejected.
- Actual MCP SDK client/server handshake and tool calls; no approval MCP tool; unauthorized UI write, cross-origin request and untrusted Host rejected; approved write/undo succeed.

`node --check public/app.js`: passed.
Dependency installation audit: 0 reported vulnerabilities at installation time.

## Manual browser verification
- Initial four tasks and controls render in the Codex in-app browser.
- Generated a recovery preview through the web form: three alternatives; original state unchanged.
- Approval disabled until review checkbox selected.
- Applied a plan and saw Casey take over pickup/groceries/dinner; Alex takes laundry at 20:30 after travel.
- Reloaded the page after a server restart: applied assignments and revision persisted.
- Undid the applied plan: original assignments restored.
- Ran the real SDK client separately; MCP read/preview events appeared in the browser.
- Used Review assistant proposal; loaded the actual saved MCP result and applied it through the review UI.
- Used 14:00–23:00 in the browser: a zero-budget proposal explicitly deferred one optional task. Allowing the fictional helper with a $12 budget produced alternatives covering all four tasks.
- Reset restored the default scenario inputs and original demo assignments. Browser warning/error log was empty at the end of the interaction checks.

## Limits
No live Alexa+ connection, runtime LLM inference, real calendar writes, payment, messaging, mobile-browser execution or real-user testing has been performed. The local fixture is not a production deployment. Registration/public-video publication/final submission are separate external steps, not implied by passing tests.
