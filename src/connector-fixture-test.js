import { generateConnectorGuide, SUPPORTED_CONNECTORS } from "./connector-guides.js";

for (const connector of SUPPORTED_CONNECTORS) {
  const guide = generateConnectorGuide(connector, {
    dbPath: "/private/tmp/shared-state-hub-dev.db"
  });

  assertIncludes(guide, `# Shared State Hub connector: ${connector}`);
  assertIncludes(guide, "This command is read-only. No files were modified.");
  assertIncludes(guide, "The Hub is a state relay, not an agent launcher.");
  assertIncludes(guide, "src/mcp-server.js");
  assertIncludes(guide, "HUB_DB");
}

console.log(`OK: connector fixture passed for ${SUPPORTED_CONNECTORS.size} connectors`);

function assertIncludes(text, expected) {
  if (!text.includes(expected)) {
    throw new Error(`expected connector guide to include: ${expected}`);
  }
}
