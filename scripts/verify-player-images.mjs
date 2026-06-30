import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const serverScriptPath = path.resolve(scriptDir, "..", "..", "nba_82-0_server", "scripts", "verify-player-images.js");
const result = spawnSync(process.execPath, [serverScriptPath, ...process.argv.slice(2)], {
  cwd: path.dirname(serverScriptPath),
  stdio: "inherit",
});

process.exit(result.status ?? 1);
