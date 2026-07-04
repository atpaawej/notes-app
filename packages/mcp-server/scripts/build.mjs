import { build } from "esbuild";
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

await rmSync(resolve(root, "dist"), { recursive: true, force: true });

await build({
  entryPoints: [resolve(root, "src/index.ts")],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  outfile: resolve(root, "dist/index.js"),
  // Bundle every dep including @notes/db (whose package.json points at .ts
  // source that Node can't load directly) into a single self-contained file.
  packages: undefined,
  banner: {
    js: [
      "import { createRequire as __notes_mcp_createRequire } from 'node:module';",
      "const require = __notes_mcp_createRequire(import.meta.url);",
    ].join("\n"),
  },
  sourcemap: true,
  logLevel: "info",
});