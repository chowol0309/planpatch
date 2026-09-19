# English demo script — target 90 seconds

This walkthrough must use actual running application states. Any captured-state montage should be labeled as such. Identify the command-line demo as a scripted MCP client.

0–10s: "This is PlanPatch. One changed shift can break school pickup, groceries and dinner. We help a household recover the whole day, then review every change. All data here is fictional."

10–25s: Show original schedule. "Alex is now unavailable from two until eight. There is no extra budget and no outside helper. The planner checks availability, travel and workload together."

25–40s: Run npm run demo:mcp and show the actual output/activity. "This SDK client connects to a real MCP Streamable HTTP endpoint, reads the household, and asks for a recovery preview. This is a scripted protocol demo. It has not changed the schedule."

40–60s: Load the assistant proposal. "Casey can cover pickup, groceries and dinner. To keep Casey within the workload limit, laundry moves to Alex after work and travel. Alternatives show what would be deferred."

60–75s: Check review box, apply, refresh, undo. "The person reviews the changes and applies them to local state. The result survives refresh. Undo restores the previous schedule. Old proposals cannot overwrite a newer revision."

75–90s: "The prototype uses a working MCP server, a deterministic constraint solver, and a separate review screen. It does not yet connect to live Alexa+, external calendars or messages. Next we would validate it with shift-working households and add accepted calendar handoffs."
