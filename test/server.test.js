import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createApp } from '../src/server.js';
import { PlanStore } from '../src/store.js';
import { request as httpRequest } from 'node:http';

test('real MCP handshake, tool execution, UI approval boundary and undo round trip', async () => {
  const store = new PlanStore();
  const server = createApp({store}).listen(0,'127.0.0.1');
  await new Promise(r=>server.once('listening',r));
  const base=`http://127.0.0.1:${server.address().port}`;
  const transport = new StreamableHTTPClientTransport(new URL(`${base}/mcp`));
  const client = new Client({name:'planpatch-test',version:'1.0.0'});
  try {
    await client.connect(transport);
    const tools=await client.listTools();
    assert.deepEqual(tools.tools.map(t=>t.name).sort(),['get_household','get_recovery_plan','preview_recovery']);
    const context=await client.callTool({name:'get_household',arguments:{}});
    assert.equal(context.structuredContent.revision,0);
    const result=await client.callTool({name:'preview_recovery',arguments:{person:'alex',from:'14:00',until:'20:00',budget:0,allowHelper:false}});
    assert.notEqual(result.isError,true);
    const plan=result.structuredContent;
    assert.ok(plan.options.length);
    assert.equal(store.state.revision,0);
    const req = body => ({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const body={planId:plan.id,optionId:plan.options[0].id,confirm:true};
    assert.equal((await fetch(`${base}/api/approve`,req(body))).status,403);
    const {token}=await (await fetch(`${base}/api/session`)).json();
    const post = (url,body,extra={}) => fetch(base+url,{...req(body),headers:{...req(body).headers,'X-PlanPatch-UI':token,...extra}});
    assert.equal((await post('/api/approve',body,{Origin:'https://untrusted.example'})).status,403);
    assert.equal((await post('/api/approve',{...body,confirm:false})).status,400);
    const applied=await post('/api/approve',body); assert.equal(applied.status,200);
    assert.equal((await applied.json()).revision,1);
    assert.equal((await post('/api/approve',body)).status,400);
    assert.equal((await post('/api/undo',{})).status,200);
    assert.equal(store.state.revision,2);
    const unsupported=await fetch(`${base}/mcp`); assert.equal(unsupported.status,405);
    // Node fetch normalizes Host; use a raw HTTP request to actually exercise rebinding protection.
    const hostileStatus=await new Promise((resolve,reject) => {
      const req=httpRequest(`${base}/api/state`,{headers:{Host:'untrusted.example'}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});
      req.on('error',reject);req.end();
    });
    assert.equal(hostileStatus,403);
  } finally { await client.close(); await new Promise(r=>server.close(r)); }
});
