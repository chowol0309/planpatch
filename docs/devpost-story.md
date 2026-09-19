## Why PlanPatch

A changed work shift can upset several parts of a family's day at once. School pickup still happens at 3pm, groceries still need collecting, and someone needs time to make dinner. A reminder doesn't tell you who can take over.

PlanPatch starts with that problem. It takes the day's tasks and a person's new availability, then finds a few ways to cover the work. You can compare the changes before applying a plan.

## What works

The demo follows a fictional household with four tasks. The planner checks fixed appointments, travel time, workload and an optional helper budget. If something can wait until tomorrow, it shows that explicitly. If an essential task can't be covered, it reports the problem.

Plans are previews until you review and approve them. Changes are saved locally, survive a refresh, and can be undone. An expired or outdated preview can't overwrite a newer schedule.

## How it's built

The backend is Node.js with Express and the MCP TypeScript SDK. The MCP endpoint uses Streamable HTTP and protocol version 2025-11-25. Three tools read the household, generate alternatives and retrieve a proposal. The browser handles review and approval.

The scheduler searches the small demo's possible time slots and assignees, then ranks feasible plans by deferrals, cost and changes to the original schedule. It runs locally without a paid API.

## What was tricky

A schedule can look sensible and still leave no time to travel between tasks. Workload limits can also make an otherwise free person unavailable for more work. These constraints are checked together. Eight automated tests cover scheduling, persistence, undo and the MCP connection; the review flow was also checked in a browser.

## Current scope and next steps

This is a local MCP prototype for the Alexa+ track, not a live Alexa+ integration. The people, schedules and helper prices are sample data. There are no real calendar updates, messages or bookings. The command-line MCP demo uses a scripted SDK client.

The next steps are testing the idea with families, calendar import and a way for each person to accept a handoff.

Source and setup instructions are available in the MIT-licensed repository.
