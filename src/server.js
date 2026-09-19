import express from 'express';
import { randomBytes } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { z } from 'zod';
import { PlanStore } from './store.js';
import { PEOPLE, TASKS, BASE_BUSY } from './planner.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = data => ({ content: [{ type: 'text', text: JSON.stringify(data) }], structuredContent: data });
export function createApp({ store = new PlanStore(resolve(ROOT, '.data/state.json')) } = {}) {
  const app = createMcpExpressApp({ host: '127.0.0.1' });
  const uiToken = randomBytes(24).toString('hex');
  const events = [];
  function event(source, tool, detail) {
    events.push({ at: new Date().toISOString(), source, tool, detail });
    if (events.length > 40) events.shift();
  }
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'");
    if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) return res.status(403).json({ error: 'Cross-origin requests are not allowed.' });
    next();
  });
  const publicState = () => ({ ...store.snapshot(), people: PEOPLE, tasks: TASKS, baseBusy: BASE_BUSY, date: '2026-09-24', events, mode: 'Local demonstration. Fictional data. No external calendars or messages.' });
  function mcpServer() {
    const server = new McpServer({ name: 'PlanPatch', version: '0.1.0' });
    server.registerTool('get_household', { description: 'Read the fictional household schedule, availability, travel and workload constraints. Local demo only.', inputSchema: {}, annotations: { readOnlyHint: true, openWorldHint: false } }, async () => {
      event('MCP', 'get_household', 'Read household context');
      return output(publicState());
    });
    server.registerTool('preview_recovery', {
      description: 'Compute feasible recovery plans for one same-day unavailability. Does not change the schedule. If infeasible, report it. Ask the user to inspect and apply their chosen preview in the local web UI. No approval or external-action tool exists.',
      inputSchema: { person: z.enum(['alex', 'casey', 'jo']), from: z.string(), until: z.string(), budget: z.number().int().min(0).max(100), allowHelper: z.boolean() },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }
    }, async input => {
      try {
        const plan = store.preview(input, 'MCP');
        event('MCP', 'preview_recovery', `${plan.options.length} feasible choices; schedule unchanged`);
        return output(plan);
      } catch (e) { return { isError: true, content: [{ type: 'text', text: e.message }] }; }
    });
    server.registerTool('get_recovery_plan', { description: 'Read a previously generated preview. Approval remains in the web UI.', inputSchema: { planId: z.string() }, annotations: { readOnlyHint: true, openWorldHint: false } }, async ({ planId }) => {
      const plan = store.snapshot().plans.find(p => p.id === planId);
      event('MCP', 'get_recovery_plan', plan ? 'Read saved preview' : 'Preview not found');
      return output({ plan: plan ?? null, currentRevision: store.state.revision });
    });
    return server;
  }
  app.post('/mcp', async (req, res) => {
    const server = mcpServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on('close', () => { void transport.close(); void server.close(); });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch {
      if (!res.headersSent) res.status(500).json({ jsonrpc: '2.0', id: null, error: { code: -32603, message: 'MCP request failed' } });
    }
  });
  app.all('/mcp', (req, res) => res.status(405).set('Allow', 'POST').json({ error: 'Use POST for stateless Streamable HTTP.' }));
  app.get('/api/state', (req, res) => res.json(publicState()));
  app.get('/api/session', (req, res) => res.json({ token: uiToken }));
  app.use('/api', (req, res, next) => {
    if (req.method !== 'GET' && (req.get('X-PlanPatch-UI') !== uiToken || !req.is('application/json'))) return res.status(403).json({ error: 'Use the local application to change the demo.' });
    next();
  });
  app.post('/api/preview', (req, res) => {
    const plan = store.preview(req.body);
    event('Web', 'preview_recovery', `${plan.options.length} feasible choices; schedule unchanged`);
    res.json(plan);
  });
  app.post('/api/approve', (req, res) => {
    if (req.body.confirm !== true) return res.status(400).json({ error: 'Explicit confirmation is required.' });
    store.approve(req.body.planId, req.body.optionId);
    event('Web', 'approve', 'Applied selected plan to the local demo schedule');
    res.json(publicState());
  });
  app.post('/api/undo', (req, res) => { store.undo(); event('Web', 'undo', 'Restored previous demo schedule'); res.json(publicState()); });
  app.post('/api/reset', (req, res) => { store.reset(); event('Web', 'reset', 'Reloaded fictional household'); res.json(publicState()); });
  app.use(express.static(resolve(ROOT, 'public')));
  app.use((err, req, res, next) => {
    const message = err instanceof z.ZodError ? err.issues.map(i => i.message).join(' ') : err.message;
    if (!res.headersSent) res.status(400).json({ error: message });
  });
  return app;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 4178);
  createApp().listen(port, '127.0.0.1', () => console.log(`PlanPatch: http://127.0.0.1:${port} | MCP: /mcp | fictional local data only`));
}
