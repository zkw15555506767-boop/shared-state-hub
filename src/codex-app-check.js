import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const home = os.homedir();
const configPath = path.join(home, ".codex", "config.toml");
const appSupportPath = path.join(home, "Library", "Application Support", "Codex");

const configExists = fs.existsSync(configPath);
const appSupportExists = fs.existsSync(appSupportPath);
const configText = configExists ? fs.readFileSync(configPath, "utf8") : "";
const mcpServers = Array.from(configText.matchAll(/^\[mcp_servers\.([^\].]+)\]$/gm)).map(
  (match) => match[1]
);
const hasSharedStateHub = mcpServers.includes("shared_state_hub");

console.log("Codex App readiness check");
console.log(`- Codex App support directory: ${appSupportExists ? "found" : "not found"}`);
console.log(`- Codex config.toml: ${configExists ? "found" : "not found"}`);
console.log(`- MCP server entries detected: ${mcpServers.length ? mcpServers.join(", ") : "none"}`);
console.log(`- Shared State Hub configured: ${hasSharedStateHub ? "yes" : "no"}`);
console.log("");
console.log("This check is read-only. It does not modify Codex App configuration.");

if (!configExists || !appSupportExists) {
  throw new Error("Codex App configuration surface was not detected on this machine.");
}

if (!hasSharedStateHub) {
  console.log("");
  console.log("Next step when you are ready:");
  console.log("  npm run connector:codex");
  console.log("");
  console.log("Then copy the printed MCP entry into Codex App config and restart/open a new Codex thread.");
}
