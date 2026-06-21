import { spawnSync } from "node:child_process";

const checks = [
  ["codex", ["--help"]],
  ["claude", ["--version"]],
  ["claude", ["mcp", "--help"]]
];

const results = checks.map(([command, args]) => run(command, args));

for (const result of results) {
  const label = [result.command, ...result.args].join(" ");
  console.log(`## ${label}`);
  console.log(`status: ${result.status === 0 ? "ok" : "failed"}`);
  if (result.stdout) console.log(`stdout:\n${indent(result.stdout.trim())}`);
  if (result.stderr) console.log(`stderr:\n${indent(result.stderr.trim())}`);
  console.log("");
}

const claudeMcpReady = results.some(
  (result) => result.command === "claude" && result.args.join(" ") === "mcp --help" && result.status === 0
);
const codexReady = results.some(
  (result) => result.command === "codex" && result.args.join(" ") === "--help" && result.status === 0
);

console.log("Summary:");
console.log(`- Codex CLI callable: ${codexReady ? "yes" : "no"}`);
console.log(`- Claude Code MCP command callable: ${claudeMcpReady ? "yes" : "no"}`);

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  return {
    command,
    args,
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr || result.error?.message
  };
}

function indent(value) {
  return value
    .split("\n")
    .slice(0, 40)
    .map((line) => `  ${line}`)
    .join("\n");
}
