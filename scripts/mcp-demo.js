import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const client = new Client({name:'planpatch-reproducible-demo',version:'0.1.0'});
try {
  await client.connect(new StreamableHTTPClientTransport(new URL('http://127.0.0.1:4178/mcp')));
  console.log('Connected using MCP Streamable HTTP. This is a scripted protocol demo, not LLM inference.');
  const context=await client.callTool({name:'get_household',arguments:{}});
  console.log('Saved schedule revision:',context.structuredContent.revision);
  const preview=await client.callTool({name:'preview_recovery',arguments:{person:'alex',from:'14:00',until:'20:00',budget:0,allowHelper:false}});
  console.log(JSON.stringify(preview.structuredContent,null,2));
  console.log('No calendar writes or messages. Review/apply through the local UI.');
} finally { await client.close(); }
