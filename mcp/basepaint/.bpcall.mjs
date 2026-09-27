import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import fs from "node:fs";
const [,, tool, argsJson, outDir] = process.argv;
const t = new StdioClientTransport({ command: "node", args: ["dist/src/index.js"], cwd: process.cwd(), stderr: "ignore" });
const c = new Client({ name: "cli", version: "1" });
await c.connect(t);
if (tool === "list") { console.log((await c.listTools()).tools.map(x => x.name + ": " + JSON.stringify(x.inputSchema)).join("\n\n")); process.exit(0); }
const r = await c.callTool({ name: tool, arguments: JSON.parse(argsJson || "{}") }, undefined, { timeout: 600000 });
let i = 0;
for (const p of r.content) {
  if (p.type === "text") console.log(p.text);
  else if (p.type === "image") { const f = `${outDir}/${tool}_${Date.now()}_${i++}.png`; fs.writeFileSync(f, Buffer.from(p.data, "base64")); console.log("IMAGE:", f); }
}
process.exit(0);
