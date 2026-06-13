// vite.config.js
import path2 from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import { defineConfig, loadEnv } from "file:///Users/ataberkol/Documents/MonsterBattler/node_modules/vite/dist/node/index.js";

// tools/pixel-generator/api.js
import path from "path";
import { fileURLToPath } from "url";
import { Agent, CursorAgentError } from "file:///Users/ataberkol/Documents/MonsterBattler/node_modules/@cursor/sdk/dist/esm/index.js";

// tools/pixel-generator/prompt.js
var EXAMPLES = `
EXAMPLE \u2014 pot (16\xD716):
[
  "................","................","................",".....000000.....",
  "....03333330....",".....033330.....","....03222230....","...0322222230...",
  "...0322222230...","...0322112230...","...0322112230...","....03222230....",
  ".....022220.....",".....000000.....","................","................"
]

EXAMPLE \u2014 sign (16\xD716):
[
  "................","................","...0000000000...","...0233333320...",
  "....0232323230...","...0233333320...","...0232323320...","...0233333320...",
  "....0000000000...","......0110......","......0110......","......0110......",
  ".....011110.....","................","................","................"
]

EXAMPLE \u2014 barrel (16\xD716):
[
  "................","................",".....000000.....","....02222220....",
  "...0211111120...","...0222222220...","...0223222220...","...0211111120...",
  "...0222232220...","...0222222220...","...0211111120...","...0222222220...",
  "....02222220....",".....000000.....","................","................"
]
`;
function buildSystemPrompt() {
  return `You are a pixel artist for "Ashen Vale", a monochrome Game Boy-style 2.5D action RPG.

PALETTE (only these characters \u2014 each char is one pixel):
- "." = transparent
- "0" = darkest gray (outlines, deep shadow)
- "1" = dark gray (shadow, wood grain, mid-dark)
- "2" = light gray (main fill, mid tone)
- "3" = lightest gray (highlights, gleam \u2014 use sparingly)

STYLE RULES:
- Top-left lighting: highlights (3) cluster upper-left; shadows (0/1) lower-right.
- Crisp 1px outlines with 0 on outer edges of solid shapes.
- Center the object; leave transparent padding (.) around edges.
- Readable at 16px scale \u2014 avoid single-pixel noise clutter.
- Props feel hand-placed in a melancholy fantasy village (wood, stone, iron, cloth).
- No text, no letters, no emoji in the sprite.

${EXAMPLES}

OUTPUT: Return ONLY valid JSON (no markdown) with this shape:
{
  "variants": [
    {
      "label": "short style name",
      "description": "one-line art note",
      "rows": ["row0", "row1", ...]
    }
  ]
}

Exactly 4 variants with DISTINCT silhouettes or materials:
1. "classic" \u2014 clean, iconic, matches existing game props
2. "sturdy" \u2014 heavier, thicker outlines, more grounded
3. "worn" \u2014 chipped, patched, weathered details
4. "ornate" \u2014 extra trim, decorative detail (still readable)

Every row must be exactly WIDTH characters. Exactly HEIGHT rows per variant.`;
}
function buildUserPrompt({ name, description, width, height }) {
  const hint = description?.trim() ? `
Extra notes: ${description.trim()}` : "";
  return `Create 4 pixel-art prop variants for: "${name}"${hint}

Canvas: ${width}\xD7${height} pixels.
Each variant "rows" array must have ${height} strings, each string ${width} chars.
Use only ".", "0", "1", "2", "3".`;
}

// tools/pixel-generator/validate.js
function toVarName(name) {
  const base = String(name || "prop").trim().replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").toUpperCase();
  return base || "PROP";
}
function sanitizeRows(rows, w, h) {
  const out = [];
  const src = Array.isArray(rows) ? rows : [];
  for (let y = 0; y < h; y++) {
    let row = String(src[y] ?? "").replace(/ /g, ".").replace(/[^.0123]/g, "0");
    if (row.length < w) row = row + ".".repeat(w - row.length);
    if (row.length > w) row = row.slice(0, w);
    out.push(row);
  }
  return out;
}
function formatJsConst(name, rows, comment) {
  const varName = toVarName(name);
  const lines = [];
  for (let i = 0; i < rows.length; i += 4) {
    const chunk = rows.slice(i, i + 4).map((r) => `'${r}'`).join(",");
    lines.push(`  ${chunk}`);
  }
  const note = comment ? ` // ${comment}` : "";
  return `const ${varName} = [${note}
${lines.join(",\n")},
];`;
}
function countPixels(rows) {
  let n = 0;
  for (const row of rows) {
    for (const ch of row) if (ch !== "." && ch !== " ") n++;
  }
  return n;
}

// tools/pixel-generator/api.js
var __vite_injected_original_import_meta_url = "file:///Users/ataberkol/Documents/MonsterBattler/tools/pixel-generator/api.js";
var __dirname = path.dirname(fileURLToPath(__vite_injected_original_import_meta_url));
var REPO_ROOT = path.resolve(__dirname, "../..");
var DEFAULT_MODEL = "composer-2.5-fast";
var MIN_PIXELS = 12;
function resolveApiKey(bodyKey) {
  return bodyKey?.trim() || process.env.CURSOR_API_KEY?.trim() || "";
}
function extractJson(text) {
  const raw = String(text || "").trim();
  if (!raw) throw new Error("Empty response from model");
  try {
    return JSON.parse(raw);
  } catch {
  }
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
    }
  }
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(raw.slice(start, end + 1));
    } catch {
    }
  }
  throw new Error("Model returned invalid JSON \u2014 try again");
}
async function callCursorAgent({ apiKey, model, name, description, width, height }) {
  const prompt = [
    buildSystemPrompt(),
    "",
    "---",
    "",
    buildUserPrompt({ name, description, width, height }),
    "",
    "Reply with ONLY the JSON object. No markdown fences, no explanation."
  ].join("\n");
  let result;
  try {
    result = await Agent.prompt(prompt, {
      apiKey,
      model: { id: model || DEFAULT_MODEL },
      local: { cwd: REPO_ROOT, settingSources: [] }
    });
  } catch (err) {
    if (err instanceof CursorAgentError) {
      throw new Error(err.message || "Cursor agent failed to start");
    }
    throw err;
  }
  if (result.status === "error") {
    throw new Error("Generation run failed \u2014 try again");
  }
  const text = typeof result.result === "string" ? result.result : result.result?.text || result.result?.content || "";
  return extractJson(text);
}
function normalizeVariants(parsed, { name, width, height }) {
  const list = Array.isArray(parsed?.variants) ? parsed.variants : [];
  const out = [];
  for (let i = 0; i < 4; i++) {
    const v = list[i] || {};
    const rows = sanitizeRows(v.rows, width, height);
    const pixels = countPixels(rows);
    if (pixels < MIN_PIXELS) continue;
    const label = String(v.label || `variant_${i + 1}`).slice(0, 32);
    const description = String(v.description || `${name} \u2014 ${label}`).slice(0, 120);
    const suffix = i === 0 ? "" : `_${label.replace(/[^a-zA-Z0-9]+/g, "_").toLowerCase()}`;
    out.push({
      id: i + 1,
      label,
      description,
      rows,
      pixels,
      width,
      height,
      jsCode: formatJsConst(`${name}${suffix}`, rows, `${width}\xD7${height} \u2014 ${description}`),
      asciiBlock: rows.join("\n")
    });
  }
  if (out.length === 0) throw new Error("No valid sprites in model response \u2014 try again");
  return out;
}
async function generatePixelArt(body) {
  const name = String(body?.name || "").trim();
  if (!name) throw new Error("Object name is required");
  const width = Math.min(48, Math.max(8, Number(body?.width) || 16));
  const height = Math.min(48, Math.max(8, Number(body?.height) || 16));
  const description = String(body?.description || "");
  const model = String(body?.model || DEFAULT_MODEL);
  const apiKey = resolveApiKey(body?.apiKey);
  if (!apiKey) {
    throw new Error(
      "No Cursor API key. Set CURSOR_API_KEY in .env (uses your subscription credits) or paste a key from cursor.com/dashboard \u2192 Integrations."
    );
  }
  const parsed = await callCursorAgent({ apiKey, model, name, description, width, height });
  const variants = normalizeVariants(parsed, { name, width, height });
  return {
    name,
    width,
    height,
    model,
    provider: "cursor",
    variants,
    usage: {
      register: `this.props.${toPropKey(name)} = asciiCanvas(${toVarName2(name)});`
    }
  };
}
function toVarName2(name) {
  const base = String(name).trim().replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").toUpperCase();
  return base || "PROP";
}
function toPropKey(name) {
  return String(name).trim().replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").toLowerCase() || "prop";
}

// vite.config.js
var __vite_injected_original_import_meta_url2 = "file:///Users/ataberkol/Documents/MonsterBattler/vite.config.js";
var __dirname2 = path2.dirname(fileURLToPath2(__vite_injected_original_import_meta_url2));
var VIEWER = "/tools/sprite-viewer/";
var REDIRECTS = /* @__PURE__ */ new Map([
  ["/sprite-viewer", VIEWER],
  ["/sprite-viewer/", VIEWER],
  ["/tools/sprite-viewer", VIEWER]
]);
function pixelArtApi() {
  const handler = async (req, res, next) => {
    const url = req.url?.split("?")[0] ?? "";
    if (url !== "/api/pixel-art/generate") return next();
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      });
      res.end();
      return;
    }
    if (req.method !== "POST") {
      res.writeHead(405, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Method not allowed" }));
      return;
    }
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const result = await generatePixelArt(payload);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message || "Generation failed" }));
      }
    });
  };
  return {
    name: "pixel-art-api",
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    }
  };
}
function spriteViewerRedirects() {
  const handler = (req, res, next) => {
    const url = req.url ?? "";
    const pathname = url.split("?")[0];
    const qs = url.includes("?") ? url.slice(url.indexOf("?")) : "";
    const target = REDIRECTS.get(pathname);
    if (target) {
      res.writeHead(301, { Location: target + qs });
      res.end();
      return;
    }
    next();
  };
  return {
    name: "sprite-viewer-redirects",
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    }
  };
}
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname2, "");
  if (env.CURSOR_API_KEY && !process.env.CURSOR_API_KEY) {
    process.env.CURSOR_API_KEY = env.CURSOR_API_KEY;
  }
  return {
    appType: "mpa",
    resolve: {
      alias: {
        "@": path2.resolve(__dirname2, "src")
      }
    },
    plugins: [pixelArtApi(), spriteViewerRedirects()],
    // Honor a PORT env var (e.g. from preview tooling); falls back to Vite's default.
    server: process.env.PORT ? { port: Number(process.env.PORT), strictPort: true } : void 0,
    build: {
      rollupOptions: {
        input: {
          main: "index.html",
          spriteViewer: "tools/sprite-viewer/index.html",
          pixelGenerator: "tools/pixel-generator/index.html",
          spriteViewerRedirect: "sprite-viewer.html",
          spriteViewerAlias: "sprite-viewer/index.html"
        }
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiLCAidG9vbHMvcGl4ZWwtZ2VuZXJhdG9yL2FwaS5qcyIsICJ0b29scy9waXhlbC1nZW5lcmF0b3IvcHJvbXB0LmpzIiwgInRvb2xzL3BpeGVsLWdlbmVyYXRvci92YWxpZGF0ZS5qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9Vc2Vycy9hdGFiZXJrb2wvRG9jdW1lbnRzL01vbnN0ZXJCYXR0bGVyXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvYXRhYmVya29sL0RvY3VtZW50cy9Nb25zdGVyQmF0dGxlci92aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvYXRhYmVya29sL0RvY3VtZW50cy9Nb25zdGVyQmF0dGxlci92aXRlLmNvbmZpZy5qc1wiO2ltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgZmlsZVVSTFRvUGF0aCB9IGZyb20gJ3VybCc7XG5pbXBvcnQgeyBkZWZpbmVDb25maWcsIGxvYWRFbnYgfSBmcm9tICd2aXRlJztcbmltcG9ydCB7IGdlbmVyYXRlUGl4ZWxBcnQgfSBmcm9tICcuL3Rvb2xzL3BpeGVsLWdlbmVyYXRvci9hcGkuanMnO1xuXG5jb25zdCBfX2Rpcm5hbWUgPSBwYXRoLmRpcm5hbWUoZmlsZVVSTFRvUGF0aChpbXBvcnQubWV0YS51cmwpKTtcbmNvbnN0IFZJRVdFUiA9ICcvdG9vbHMvc3ByaXRlLXZpZXdlci8nO1xuXG4vKiogUGF0aHMgdGhhdCBzaG91bGQgMzAxIHRvIHRoZSBjYW5vbmljYWwgc3ByaXRlIHZpZXdlciBVUkwuICovXG5jb25zdCBSRURJUkVDVFMgPSBuZXcgTWFwKFtcbiAgWycvc3ByaXRlLXZpZXdlcicsIFZJRVdFUl0sXG4gIFsnL3Nwcml0ZS12aWV3ZXIvJywgVklFV0VSXSxcbiAgWycvdG9vbHMvc3ByaXRlLXZpZXdlcicsIFZJRVdFUl0sXG5dKTtcblxuZnVuY3Rpb24gcGl4ZWxBcnRBcGkoKSB7XG4gIGNvbnN0IGhhbmRsZXIgPSBhc3luYyAocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICBjb25zdCB1cmwgPSByZXEudXJsPy5zcGxpdCgnPycpWzBdID8/ICcnO1xuICAgIGlmICh1cmwgIT09ICcvYXBpL3BpeGVsLWFydC9nZW5lcmF0ZScpIHJldHVybiBuZXh0KCk7XG4gICAgaWYgKHJlcS5tZXRob2QgPT09ICdPUFRJT05TJykge1xuICAgICAgcmVzLndyaXRlSGVhZCgyMDQsIHtcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnOiAnUE9TVCwgT1BUSU9OUycsXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogJ0NvbnRlbnQtVHlwZScsXG4gICAgICB9KTtcbiAgICAgIHJlcy5lbmQoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHJlcS5tZXRob2QgIT09ICdQT1NUJykge1xuICAgICAgcmVzLndyaXRlSGVhZCg0MDUsIHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9KTtcbiAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ01ldGhvZCBub3QgYWxsb3dlZCcgfSkpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBsZXQgYm9keSA9ICcnO1xuICAgIHJlcS5vbignZGF0YScsIGNodW5rID0+IHsgYm9keSArPSBjaHVuazsgfSk7XG4gICAgcmVxLm9uKCdlbmQnLCBhc3luYyAoKSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBwYXlsb2FkID0gYm9keSA/IEpTT04ucGFyc2UoYm9keSkgOiB7fTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZ2VuZXJhdGVQaXhlbEFydChwYXlsb2FkKTtcbiAgICAgICAgcmVzLndyaXRlSGVhZCgyMDAsIHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9KTtcbiAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeShyZXN1bHQpKTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICByZXMud3JpdGVIZWFkKDQwMCwgeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0pO1xuICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6IGVyci5tZXNzYWdlIHx8ICdHZW5lcmF0aW9uIGZhaWxlZCcgfSkpO1xuICAgICAgfVxuICAgIH0pO1xuICB9O1xuICByZXR1cm4ge1xuICAgIG5hbWU6ICdwaXhlbC1hcnQtYXBpJyxcbiAgICBjb25maWd1cmVTZXJ2ZXIoc2VydmVyKSB7XG4gICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKGhhbmRsZXIpO1xuICAgIH0sXG4gICAgY29uZmlndXJlUHJldmlld1NlcnZlcihzZXJ2ZXIpIHtcbiAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoaGFuZGxlcik7XG4gICAgfSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gc3ByaXRlVmlld2VyUmVkaXJlY3RzKCkge1xuICBjb25zdCBoYW5kbGVyID0gKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gICAgY29uc3QgdXJsID0gcmVxLnVybCA/PyAnJztcbiAgICBjb25zdCBwYXRobmFtZSA9IHVybC5zcGxpdCgnPycpWzBdO1xuICAgIGNvbnN0IHFzID0gdXJsLmluY2x1ZGVzKCc/JykgPyB1cmwuc2xpY2UodXJsLmluZGV4T2YoJz8nKSkgOiAnJztcbiAgICBjb25zdCB0YXJnZXQgPSBSRURJUkVDVFMuZ2V0KHBhdGhuYW1lKTtcbiAgICBpZiAodGFyZ2V0KSB7XG4gICAgICByZXMud3JpdGVIZWFkKDMwMSwgeyBMb2NhdGlvbjogdGFyZ2V0ICsgcXMgfSk7XG4gICAgICByZXMuZW5kKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIG5leHQoKTtcbiAgfTtcbiAgcmV0dXJuIHtcbiAgICBuYW1lOiAnc3ByaXRlLXZpZXdlci1yZWRpcmVjdHMnLFxuICAgIGNvbmZpZ3VyZVNlcnZlcihzZXJ2ZXIpIHtcbiAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoaGFuZGxlcik7XG4gICAgfSxcbiAgICBjb25maWd1cmVQcmV2aWV3U2VydmVyKHNlcnZlcikge1xuICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZShoYW5kbGVyKTtcbiAgICB9LFxuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiB7XG4gIGNvbnN0IGVudiA9IGxvYWRFbnYobW9kZSwgX19kaXJuYW1lLCAnJyk7XG4gIGlmIChlbnYuQ1VSU09SX0FQSV9LRVkgJiYgIXByb2Nlc3MuZW52LkNVUlNPUl9BUElfS0VZKSB7XG4gICAgcHJvY2Vzcy5lbnYuQ1VSU09SX0FQSV9LRVkgPSBlbnYuQ1VSU09SX0FQSV9LRVk7XG4gIH1cblxuICByZXR1cm4ge1xuICBhcHBUeXBlOiAnbXBhJyxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICAnQCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMnKSxcbiAgICB9LFxuICB9LFxuICBwbHVnaW5zOiBbcGl4ZWxBcnRBcGkoKSwgc3ByaXRlVmlld2VyUmVkaXJlY3RzKCldLFxuICAvLyBIb25vciBhIFBPUlQgZW52IHZhciAoZS5nLiBmcm9tIHByZXZpZXcgdG9vbGluZyk7IGZhbGxzIGJhY2sgdG8gVml0ZSdzIGRlZmF1bHQuXG4gIHNlcnZlcjogcHJvY2Vzcy5lbnYuUE9SVCA/IHsgcG9ydDogTnVtYmVyKHByb2Nlc3MuZW52LlBPUlQpLCBzdHJpY3RQb3J0OiB0cnVlIH0gOiB1bmRlZmluZWQsXG4gIGJ1aWxkOiB7XG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgaW5wdXQ6IHtcbiAgICAgICAgbWFpbjogJ2luZGV4Lmh0bWwnLFxuICAgICAgICBzcHJpdGVWaWV3ZXI6ICd0b29scy9zcHJpdGUtdmlld2VyL2luZGV4Lmh0bWwnLFxuICAgICAgICBwaXhlbEdlbmVyYXRvcjogJ3Rvb2xzL3BpeGVsLWdlbmVyYXRvci9pbmRleC5odG1sJyxcbiAgICAgICAgc3ByaXRlVmlld2VyUmVkaXJlY3Q6ICdzcHJpdGUtdmlld2VyLmh0bWwnLFxuICAgICAgICBzcHJpdGVWaWV3ZXJBbGlhczogJ3Nwcml0ZS12aWV3ZXIvaW5kZXguaHRtbCcsXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG59O1xufSk7XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9Vc2Vycy9hdGFiZXJrb2wvRG9jdW1lbnRzL01vbnN0ZXJCYXR0bGVyL3Rvb2xzL3BpeGVsLWdlbmVyYXRvclwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL2F0YWJlcmtvbC9Eb2N1bWVudHMvTW9uc3RlckJhdHRsZXIvdG9vbHMvcGl4ZWwtZ2VuZXJhdG9yL2FwaS5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvYXRhYmVya29sL0RvY3VtZW50cy9Nb25zdGVyQmF0dGxlci90b29scy9waXhlbC1nZW5lcmF0b3IvYXBpLmpzXCI7aW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSAndXJsJztcbmltcG9ydCB7IEFnZW50LCBDdXJzb3JBZ2VudEVycm9yIH0gZnJvbSAnQGN1cnNvci9zZGsnO1xuaW1wb3J0IHsgYnVpbGRTeXN0ZW1Qcm9tcHQsIGJ1aWxkVXNlclByb21wdCB9IGZyb20gJy4vcHJvbXB0LmpzJztcbmltcG9ydCB7IGNvdW50UGl4ZWxzLCBmb3JtYXRKc0NvbnN0LCBzYW5pdGl6ZVJvd3MgfSBmcm9tICcuL3ZhbGlkYXRlLmpzJztcblxuY29uc3QgX19kaXJuYW1lID0gcGF0aC5kaXJuYW1lKGZpbGVVUkxUb1BhdGgoaW1wb3J0Lm1ldGEudXJsKSk7XG5jb25zdCBSRVBPX1JPT1QgPSBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4nKTtcblxuY29uc3QgREVGQVVMVF9NT0RFTCA9ICdjb21wb3Nlci0yLjUtZmFzdCc7XG5jb25zdCBNSU5fUElYRUxTID0gMTI7XG5cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlQXBpS2V5KGJvZHlLZXkpIHtcbiAgcmV0dXJuIGJvZHlLZXk/LnRyaW0oKSB8fCBwcm9jZXNzLmVudi5DVVJTT1JfQVBJX0tFWT8udHJpbSgpIHx8ICcnO1xufVxuXG5mdW5jdGlvbiBleHRyYWN0SnNvbih0ZXh0KSB7XG4gIGNvbnN0IHJhdyA9IFN0cmluZyh0ZXh0IHx8ICcnKS50cmltKCk7XG4gIGlmICghcmF3KSB0aHJvdyBuZXcgRXJyb3IoJ0VtcHR5IHJlc3BvbnNlIGZyb20gbW9kZWwnKTtcblxuICB0cnkge1xuICAgIHJldHVybiBKU09OLnBhcnNlKHJhdyk7XG4gIH0gY2F0Y2ggeyAvKiBjb250aW51ZSAqLyB9XG5cbiAgY29uc3QgZmVuY2VkID0gcmF3Lm1hdGNoKC9gYGAoPzpqc29uKT9cXHMqKFtcXHNcXFNdKj8pYGBgL2kpO1xuICBpZiAoZmVuY2VkKSB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBKU09OLnBhcnNlKGZlbmNlZFsxXS50cmltKCkpO1xuICAgIH0gY2F0Y2ggeyAvKiBjb250aW51ZSAqLyB9XG4gIH1cblxuICBjb25zdCBzdGFydCA9IHJhdy5pbmRleE9mKCd7Jyk7XG4gIGNvbnN0IGVuZCA9IHJhdy5sYXN0SW5kZXhPZignfScpO1xuICBpZiAoc3RhcnQgPj0gMCAmJiBlbmQgPiBzdGFydCkge1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gSlNPTi5wYXJzZShyYXcuc2xpY2Uoc3RhcnQsIGVuZCArIDEpKTtcbiAgICB9IGNhdGNoIHsgLyogY29udGludWUgKi8gfVxuICB9XG5cbiAgdGhyb3cgbmV3IEVycm9yKCdNb2RlbCByZXR1cm5lZCBpbnZhbGlkIEpTT04gXHUyMDE0IHRyeSBhZ2FpbicpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBjYWxsQ3Vyc29yQWdlbnQoeyBhcGlLZXksIG1vZGVsLCBuYW1lLCBkZXNjcmlwdGlvbiwgd2lkdGgsIGhlaWdodCB9KSB7XG4gIGNvbnN0IHByb21wdCA9IFtcbiAgICBidWlsZFN5c3RlbVByb21wdCgpLFxuICAgICcnLFxuICAgICctLS0nLFxuICAgICcnLFxuICAgIGJ1aWxkVXNlclByb21wdCh7IG5hbWUsIGRlc2NyaXB0aW9uLCB3aWR0aCwgaGVpZ2h0IH0pLFxuICAgICcnLFxuICAgICdSZXBseSB3aXRoIE9OTFkgdGhlIEpTT04gb2JqZWN0LiBObyBtYXJrZG93biBmZW5jZXMsIG5vIGV4cGxhbmF0aW9uLicsXG4gIF0uam9pbignXFxuJyk7XG5cbiAgbGV0IHJlc3VsdDtcbiAgdHJ5IHtcbiAgICByZXN1bHQgPSBhd2FpdCBBZ2VudC5wcm9tcHQocHJvbXB0LCB7XG4gICAgICBhcGlLZXksXG4gICAgICBtb2RlbDogeyBpZDogbW9kZWwgfHwgREVGQVVMVF9NT0RFTCB9LFxuICAgICAgbG9jYWw6IHsgY3dkOiBSRVBPX1JPT1QsIHNldHRpbmdTb3VyY2VzOiBbXSB9LFxuICAgIH0pO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBpZiAoZXJyIGluc3RhbmNlb2YgQ3Vyc29yQWdlbnRFcnJvcikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGVyci5tZXNzYWdlIHx8ICdDdXJzb3IgYWdlbnQgZmFpbGVkIHRvIHN0YXJ0Jyk7XG4gICAgfVxuICAgIHRocm93IGVycjtcbiAgfVxuXG4gIGlmIChyZXN1bHQuc3RhdHVzID09PSAnZXJyb3InKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdHZW5lcmF0aW9uIHJ1biBmYWlsZWQgXHUyMDE0IHRyeSBhZ2FpbicpO1xuICB9XG5cbiAgY29uc3QgdGV4dCA9IHR5cGVvZiByZXN1bHQucmVzdWx0ID09PSAnc3RyaW5nJ1xuICAgID8gcmVzdWx0LnJlc3VsdFxuICAgIDogcmVzdWx0LnJlc3VsdD8udGV4dCB8fCByZXN1bHQucmVzdWx0Py5jb250ZW50IHx8ICcnO1xuXG4gIHJldHVybiBleHRyYWN0SnNvbih0ZXh0KTtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplVmFyaWFudHMocGFyc2VkLCB7IG5hbWUsIHdpZHRoLCBoZWlnaHQgfSkge1xuICBjb25zdCBsaXN0ID0gQXJyYXkuaXNBcnJheShwYXJzZWQ/LnZhcmlhbnRzKSA/IHBhcnNlZC52YXJpYW50cyA6IFtdO1xuICBjb25zdCBvdXQgPSBbXTtcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IDQ7IGkrKykge1xuICAgIGNvbnN0IHYgPSBsaXN0W2ldIHx8IHt9O1xuICAgIGNvbnN0IHJvd3MgPSBzYW5pdGl6ZVJvd3Modi5yb3dzLCB3aWR0aCwgaGVpZ2h0KTtcbiAgICBjb25zdCBwaXhlbHMgPSBjb3VudFBpeGVscyhyb3dzKTtcbiAgICBpZiAocGl4ZWxzIDwgTUlOX1BJWEVMUykgY29udGludWU7XG5cbiAgICBjb25zdCBsYWJlbCA9IFN0cmluZyh2LmxhYmVsIHx8IGB2YXJpYW50XyR7aSArIDF9YCkuc2xpY2UoMCwgMzIpO1xuICAgIGNvbnN0IGRlc2NyaXB0aW9uID0gU3RyaW5nKHYuZGVzY3JpcHRpb24gfHwgYCR7bmFtZX0gXHUyMDE0ICR7bGFiZWx9YCkuc2xpY2UoMCwgMTIwKTtcbiAgICBjb25zdCBzdWZmaXggPSBpID09PSAwID8gJycgOiBgXyR7bGFiZWwucmVwbGFjZSgvW15hLXpBLVowLTldKy9nLCAnXycpLnRvTG93ZXJDYXNlKCl9YDtcblxuICAgIG91dC5wdXNoKHtcbiAgICAgIGlkOiBpICsgMSxcbiAgICAgIGxhYmVsLFxuICAgICAgZGVzY3JpcHRpb24sXG4gICAgICByb3dzLFxuICAgICAgcGl4ZWxzLFxuICAgICAgd2lkdGgsXG4gICAgICBoZWlnaHQsXG4gICAgICBqc0NvZGU6IGZvcm1hdEpzQ29uc3QoYCR7bmFtZX0ke3N1ZmZpeH1gLCByb3dzLCBgJHt3aWR0aH1cdTAwRDcke2hlaWdodH0gXHUyMDE0ICR7ZGVzY3JpcHRpb259YCksXG4gICAgICBhc2NpaUJsb2NrOiByb3dzLmpvaW4oJ1xcbicpLFxuICAgIH0pO1xuICB9XG5cbiAgaWYgKG91dC5sZW5ndGggPT09IDApIHRocm93IG5ldyBFcnJvcignTm8gdmFsaWQgc3ByaXRlcyBpbiBtb2RlbCByZXNwb25zZSBcdTIwMTQgdHJ5IGFnYWluJyk7XG4gIHJldHVybiBvdXQ7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZW5lcmF0ZVBpeGVsQXJ0KGJvZHkpIHtcbiAgY29uc3QgbmFtZSA9IFN0cmluZyhib2R5Py5uYW1lIHx8ICcnKS50cmltKCk7XG4gIGlmICghbmFtZSkgdGhyb3cgbmV3IEVycm9yKCdPYmplY3QgbmFtZSBpcyByZXF1aXJlZCcpO1xuXG4gIGNvbnN0IHdpZHRoID0gTWF0aC5taW4oNDgsIE1hdGgubWF4KDgsIE51bWJlcihib2R5Py53aWR0aCkgfHwgMTYpKTtcbiAgY29uc3QgaGVpZ2h0ID0gTWF0aC5taW4oNDgsIE1hdGgubWF4KDgsIE51bWJlcihib2R5Py5oZWlnaHQpIHx8IDE2KSk7XG4gIGNvbnN0IGRlc2NyaXB0aW9uID0gU3RyaW5nKGJvZHk/LmRlc2NyaXB0aW9uIHx8ICcnKTtcbiAgY29uc3QgbW9kZWwgPSBTdHJpbmcoYm9keT8ubW9kZWwgfHwgREVGQVVMVF9NT0RFTCk7XG4gIGNvbnN0IGFwaUtleSA9IHJlc29sdmVBcGlLZXkoYm9keT8uYXBpS2V5KTtcblxuICBpZiAoIWFwaUtleSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICdObyBDdXJzb3IgQVBJIGtleS4gU2V0IENVUlNPUl9BUElfS0VZIGluIC5lbnYgKHVzZXMgeW91ciBzdWJzY3JpcHRpb24gY3JlZGl0cykgb3IgcGFzdGUgYSBrZXkgZnJvbSBjdXJzb3IuY29tL2Rhc2hib2FyZCBcdTIxOTIgSW50ZWdyYXRpb25zLidcbiAgICApO1xuICB9XG5cbiAgY29uc3QgcGFyc2VkID0gYXdhaXQgY2FsbEN1cnNvckFnZW50KHsgYXBpS2V5LCBtb2RlbCwgbmFtZSwgZGVzY3JpcHRpb24sIHdpZHRoLCBoZWlnaHQgfSk7XG4gIGNvbnN0IHZhcmlhbnRzID0gbm9ybWFsaXplVmFyaWFudHMocGFyc2VkLCB7IG5hbWUsIHdpZHRoLCBoZWlnaHQgfSk7XG5cbiAgcmV0dXJuIHtcbiAgICBuYW1lLFxuICAgIHdpZHRoLFxuICAgIGhlaWdodCxcbiAgICBtb2RlbCxcbiAgICBwcm92aWRlcjogJ2N1cnNvcicsXG4gICAgdmFyaWFudHMsXG4gICAgdXNhZ2U6IHtcbiAgICAgIHJlZ2lzdGVyOiBgdGhpcy5wcm9wcy4ke3RvUHJvcEtleShuYW1lKX0gPSBhc2NpaUNhbnZhcygke3RvVmFyTmFtZShuYW1lKX0pO2AsXG4gICAgfSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gdG9WYXJOYW1lKG5hbWUpIHtcbiAgY29uc3QgYmFzZSA9IFN0cmluZyhuYW1lKS50cmltKCkucmVwbGFjZSgvW15hLXpBLVowLTldKy9nLCAnXycpLnJlcGxhY2UoL15fK3xfKyQvZywgJycpLnRvVXBwZXJDYXNlKCk7XG4gIHJldHVybiBiYXNlIHx8ICdQUk9QJztcbn1cblxuZnVuY3Rpb24gdG9Qcm9wS2V5KG5hbWUpIHtcbiAgcmV0dXJuIFN0cmluZyhuYW1lKS50cmltKCkucmVwbGFjZSgvW15hLXpBLVowLTldKy9nLCAnXycpLnJlcGxhY2UoL15fK3xfKyQvZywgJycpLnRvTG93ZXJDYXNlKCkgfHwgJ3Byb3AnO1xufVxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvYXRhYmVya29sL0RvY3VtZW50cy9Nb25zdGVyQmF0dGxlci90b29scy9waXhlbC1nZW5lcmF0b3JcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9hdGFiZXJrb2wvRG9jdW1lbnRzL01vbnN0ZXJCYXR0bGVyL3Rvb2xzL3BpeGVsLWdlbmVyYXRvci9wcm9tcHQuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL2F0YWJlcmtvbC9Eb2N1bWVudHMvTW9uc3RlckJhdHRsZXIvdG9vbHMvcGl4ZWwtZ2VuZXJhdG9yL3Byb21wdC5qc1wiOy8qKiBQcm9tcHQgdGVtcGxhdGVzIGZvciBBc2hlbiBWYWxlIHByb2NlZHVyYWwgcGl4ZWwgYXJ0IGdlbmVyYXRpb24uICovXG5cbmNvbnN0IEVYQU1QTEVTID0gYFxuRVhBTVBMRSBcdTIwMTQgcG90ICgxNlx1MDBENzE2KTpcbltcbiAgXCIuLi4uLi4uLi4uLi4uLi4uXCIsXCIuLi4uLi4uLi4uLi4uLi4uXCIsXCIuLi4uLi4uLi4uLi4uLi4uXCIsXCIuLi4uLjAwMDAwMC4uLi4uXCIsXG4gIFwiLi4uLjAzMzMzMzMwLi4uLlwiLFwiLi4uLi4wMzMzMzAuLi4uLlwiLFwiLi4uLjAzMjIyMjMwLi4uLlwiLFwiLi4uMDMyMjIyMjIzMC4uLlwiLFxuICBcIi4uLjAzMjIyMjIyMzAuLi5cIixcIi4uLjAzMjIxMTIyMzAuLi5cIixcIi4uLjAzMjIxMTIyMzAuLi5cIixcIi4uLi4wMzIyMjIzMC4uLi5cIixcbiAgXCIuLi4uLjAyMjIyMC4uLi4uXCIsXCIuLi4uLjAwMDAwMC4uLi4uXCIsXCIuLi4uLi4uLi4uLi4uLi4uXCIsXCIuLi4uLi4uLi4uLi4uLi4uXCJcbl1cblxuRVhBTVBMRSBcdTIwMTQgc2lnbiAoMTZcdTAwRDcxNik6XG5bXG4gIFwiLi4uLi4uLi4uLi4uLi4uLlwiLFwiLi4uLi4uLi4uLi4uLi4uLlwiLFwiLi4uMDAwMDAwMDAwMC4uLlwiLFwiLi4uMDIzMzMzMzMyMC4uLlwiLFxuICBcIi4uLi4wMjMyMzIzMjMwLi4uXCIsXCIuLi4wMjMzMzMzMzIwLi4uXCIsXCIuLi4wMjMyMzIzMzIwLi4uXCIsXCIuLi4wMjMzMzMzMzIwLi4uXCIsXG4gIFwiLi4uLjAwMDAwMDAwMDAuLi5cIixcIi4uLi4uLjAxMTAuLi4uLi5cIixcIi4uLi4uLjAxMTAuLi4uLi5cIixcIi4uLi4uLjAxMTAuLi4uLi5cIixcbiAgXCIuLi4uLjAxMTExMC4uLi4uXCIsXCIuLi4uLi4uLi4uLi4uLi4uXCIsXCIuLi4uLi4uLi4uLi4uLi4uXCIsXCIuLi4uLi4uLi4uLi4uLi4uXCJcbl1cblxuRVhBTVBMRSBcdTIwMTQgYmFycmVsICgxNlx1MDBENzE2KTpcbltcbiAgXCIuLi4uLi4uLi4uLi4uLi4uXCIsXCIuLi4uLi4uLi4uLi4uLi4uXCIsXCIuLi4uLjAwMDAwMC4uLi4uXCIsXCIuLi4uMDIyMjIyMjAuLi4uXCIsXG4gIFwiLi4uMDIxMTExMTEyMC4uLlwiLFwiLi4uMDIyMjIyMjIyMC4uLlwiLFwiLi4uMDIyMzIyMjIyMC4uLlwiLFwiLi4uMDIxMTExMTEyMC4uLlwiLFxuICBcIi4uLjAyMjIyMzIyMjAuLi5cIixcIi4uLjAyMjIyMjIyMjAuLi5cIixcIi4uLjAyMTExMTExMjAuLi5cIixcIi4uLjAyMjIyMjIyMjAuLi5cIixcbiAgXCIuLi4uMDIyMjIyMjAuLi4uXCIsXCIuLi4uLjAwMDAwMC4uLi4uXCIsXCIuLi4uLi4uLi4uLi4uLi4uXCIsXCIuLi4uLi4uLi4uLi4uLi4uXCJcbl1cbmA7XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZFN5c3RlbVByb21wdCgpIHtcbiAgcmV0dXJuIGBZb3UgYXJlIGEgcGl4ZWwgYXJ0aXN0IGZvciBcIkFzaGVuIFZhbGVcIiwgYSBtb25vY2hyb21lIEdhbWUgQm95LXN0eWxlIDIuNUQgYWN0aW9uIFJQRy5cblxuUEFMRVRURSAob25seSB0aGVzZSBjaGFyYWN0ZXJzIFx1MjAxNCBlYWNoIGNoYXIgaXMgb25lIHBpeGVsKTpcbi0gXCIuXCIgPSB0cmFuc3BhcmVudFxuLSBcIjBcIiA9IGRhcmtlc3QgZ3JheSAob3V0bGluZXMsIGRlZXAgc2hhZG93KVxuLSBcIjFcIiA9IGRhcmsgZ3JheSAoc2hhZG93LCB3b29kIGdyYWluLCBtaWQtZGFyaylcbi0gXCIyXCIgPSBsaWdodCBncmF5IChtYWluIGZpbGwsIG1pZCB0b25lKVxuLSBcIjNcIiA9IGxpZ2h0ZXN0IGdyYXkgKGhpZ2hsaWdodHMsIGdsZWFtIFx1MjAxNCB1c2Ugc3BhcmluZ2x5KVxuXG5TVFlMRSBSVUxFUzpcbi0gVG9wLWxlZnQgbGlnaHRpbmc6IGhpZ2hsaWdodHMgKDMpIGNsdXN0ZXIgdXBwZXItbGVmdDsgc2hhZG93cyAoMC8xKSBsb3dlci1yaWdodC5cbi0gQ3Jpc3AgMXB4IG91dGxpbmVzIHdpdGggMCBvbiBvdXRlciBlZGdlcyBvZiBzb2xpZCBzaGFwZXMuXG4tIENlbnRlciB0aGUgb2JqZWN0OyBsZWF2ZSB0cmFuc3BhcmVudCBwYWRkaW5nICguKSBhcm91bmQgZWRnZXMuXG4tIFJlYWRhYmxlIGF0IDE2cHggc2NhbGUgXHUyMDE0IGF2b2lkIHNpbmdsZS1waXhlbCBub2lzZSBjbHV0dGVyLlxuLSBQcm9wcyBmZWVsIGhhbmQtcGxhY2VkIGluIGEgbWVsYW5jaG9seSBmYW50YXN5IHZpbGxhZ2UgKHdvb2QsIHN0b25lLCBpcm9uLCBjbG90aCkuXG4tIE5vIHRleHQsIG5vIGxldHRlcnMsIG5vIGVtb2ppIGluIHRoZSBzcHJpdGUuXG5cbiR7RVhBTVBMRVN9XG5cbk9VVFBVVDogUmV0dXJuIE9OTFkgdmFsaWQgSlNPTiAobm8gbWFya2Rvd24pIHdpdGggdGhpcyBzaGFwZTpcbntcbiAgXCJ2YXJpYW50c1wiOiBbXG4gICAge1xuICAgICAgXCJsYWJlbFwiOiBcInNob3J0IHN0eWxlIG5hbWVcIixcbiAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJvbmUtbGluZSBhcnQgbm90ZVwiLFxuICAgICAgXCJyb3dzXCI6IFtcInJvdzBcIiwgXCJyb3cxXCIsIC4uLl1cbiAgICB9XG4gIF1cbn1cblxuRXhhY3RseSA0IHZhcmlhbnRzIHdpdGggRElTVElOQ1Qgc2lsaG91ZXR0ZXMgb3IgbWF0ZXJpYWxzOlxuMS4gXCJjbGFzc2ljXCIgXHUyMDE0IGNsZWFuLCBpY29uaWMsIG1hdGNoZXMgZXhpc3RpbmcgZ2FtZSBwcm9wc1xuMi4gXCJzdHVyZHlcIiBcdTIwMTQgaGVhdmllciwgdGhpY2tlciBvdXRsaW5lcywgbW9yZSBncm91bmRlZFxuMy4gXCJ3b3JuXCIgXHUyMDE0IGNoaXBwZWQsIHBhdGNoZWQsIHdlYXRoZXJlZCBkZXRhaWxzXG40LiBcIm9ybmF0ZVwiIFx1MjAxNCBleHRyYSB0cmltLCBkZWNvcmF0aXZlIGRldGFpbCAoc3RpbGwgcmVhZGFibGUpXG5cbkV2ZXJ5IHJvdyBtdXN0IGJlIGV4YWN0bHkgV0lEVEggY2hhcmFjdGVycy4gRXhhY3RseSBIRUlHSFQgcm93cyBwZXIgdmFyaWFudC5gO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRVc2VyUHJvbXB0KHsgbmFtZSwgZGVzY3JpcHRpb24sIHdpZHRoLCBoZWlnaHQgfSkge1xuICBjb25zdCBoaW50ID0gZGVzY3JpcHRpb24/LnRyaW0oKSA/IGBcXG5FeHRyYSBub3RlczogJHtkZXNjcmlwdGlvbi50cmltKCl9YCA6ICcnO1xuICByZXR1cm4gYENyZWF0ZSA0IHBpeGVsLWFydCBwcm9wIHZhcmlhbnRzIGZvcjogXCIke25hbWV9XCIke2hpbnR9XG5cbkNhbnZhczogJHt3aWR0aH1cdTAwRDcke2hlaWdodH0gcGl4ZWxzLlxuRWFjaCB2YXJpYW50IFwicm93c1wiIGFycmF5IG11c3QgaGF2ZSAke2hlaWdodH0gc3RyaW5ncywgZWFjaCBzdHJpbmcgJHt3aWR0aH0gY2hhcnMuXG5Vc2Ugb25seSBcIi5cIiwgXCIwXCIsIFwiMVwiLCBcIjJcIiwgXCIzXCIuYDtcbn1cbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL1VzZXJzL2F0YWJlcmtvbC9Eb2N1bWVudHMvTW9uc3RlckJhdHRsZXIvdG9vbHMvcGl4ZWwtZ2VuZXJhdG9yXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvYXRhYmVya29sL0RvY3VtZW50cy9Nb25zdGVyQmF0dGxlci90b29scy9waXhlbC1nZW5lcmF0b3IvdmFsaWRhdGUuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL2F0YWJlcmtvbC9Eb2N1bWVudHMvTW9uc3RlckJhdHRsZXIvdG9vbHMvcGl4ZWwtZ2VuZXJhdG9yL3ZhbGlkYXRlLmpzXCI7LyoqIFNhbml0aXplIGFuZCBub3JtYWxpemUgQUktZ2VuZXJhdGVkIHNwcml0ZSByb3dzIGZvciBBc2hlbiBWYWxlIGFydC5qcyBmb3JtYXQuICovXG5cbmNvbnN0IFZBTElEID0gL15bLiAwMTIzXSokLztcblxuZXhwb3J0IGZ1bmN0aW9uIHRvVmFyTmFtZShuYW1lKSB7XG4gIGNvbnN0IGJhc2UgPSBTdHJpbmcobmFtZSB8fCAncHJvcCcpXG4gICAgLnRyaW0oKVxuICAgIC5yZXBsYWNlKC9bXmEtekEtWjAtOV0rL2csICdfJylcbiAgICAucmVwbGFjZSgvXl8rfF8rJC9nLCAnJylcbiAgICAudG9VcHBlckNhc2UoKTtcbiAgcmV0dXJuIGJhc2UgfHwgJ1BST1AnO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2FuaXRpemVSb3dzKHJvd3MsIHcsIGgpIHtcbiAgY29uc3Qgb3V0ID0gW107XG4gIGNvbnN0IHNyYyA9IEFycmF5LmlzQXJyYXkocm93cykgPyByb3dzIDogW107XG4gIGZvciAobGV0IHkgPSAwOyB5IDwgaDsgeSsrKSB7XG4gICAgbGV0IHJvdyA9IFN0cmluZyhzcmNbeV0gPz8gJycpXG4gICAgICAucmVwbGFjZSgvIC9nLCAnLicpXG4gICAgICAucmVwbGFjZSgvW14uMDEyM10vZywgJzAnKTtcbiAgICBpZiAocm93Lmxlbmd0aCA8IHcpIHJvdyA9IHJvdyArICcuJy5yZXBlYXQodyAtIHJvdy5sZW5ndGgpO1xuICAgIGlmIChyb3cubGVuZ3RoID4gdykgcm93ID0gcm93LnNsaWNlKDAsIHcpO1xuICAgIG91dC5wdXNoKHJvdyk7XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJvd3NWYWxpZChyb3dzKSB7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KHJvd3MpICYmIHJvd3MubGVuZ3RoID4gMCAmJiByb3dzLmV2ZXJ5KHIgPT4gVkFMSUQudGVzdChyKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRKc0NvbnN0KG5hbWUsIHJvd3MsIGNvbW1lbnQpIHtcbiAgY29uc3QgdmFyTmFtZSA9IHRvVmFyTmFtZShuYW1lKTtcbiAgY29uc3QgbGluZXMgPSBbXTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCByb3dzLmxlbmd0aDsgaSArPSA0KSB7XG4gICAgY29uc3QgY2h1bmsgPSByb3dzLnNsaWNlKGksIGkgKyA0KS5tYXAociA9PiBgJyR7cn0nYCkuam9pbignLCcpO1xuICAgIGxpbmVzLnB1c2goYCAgJHtjaHVua31gKTtcbiAgfVxuICBjb25zdCBub3RlID0gY29tbWVudCA/IGAgLy8gJHtjb21tZW50fWAgOiAnJztcbiAgcmV0dXJuIGBjb25zdCAke3Zhck5hbWV9ID0gWyR7bm90ZX1cXG4ke2xpbmVzLmpvaW4oJyxcXG4nKX0sXFxuXTtgO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY291bnRQaXhlbHMocm93cykge1xuICBsZXQgbiA9IDA7XG4gIGZvciAoY29uc3Qgcm93IG9mIHJvd3MpIHtcbiAgICBmb3IgKGNvbnN0IGNoIG9mIHJvdykgaWYgKGNoICE9PSAnLicgJiYgY2ggIT09ICcgJykgbisrO1xuICB9XG4gIHJldHVybiBuO1xufVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUE2UyxPQUFPQSxXQUFVO0FBQzlULFNBQVMsaUJBQUFDLHNCQUFxQjtBQUM5QixTQUFTLGNBQWMsZUFBZTs7O0FDRnlULE9BQU8sVUFBVTtBQUNoWCxTQUFTLHFCQUFxQjtBQUM5QixTQUFTLE9BQU8sd0JBQXdCOzs7QUNBeEMsSUFBTSxXQUFXO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtB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QSxJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssTUFBTTtBQUN4QyxRQUFNLE1BQU0sUUFBUSxNQUFNQyxZQUFXLEVBQUU7QUFDdkMsTUFBSSxJQUFJLGtCQUFrQixDQUFDLFFBQVEsSUFBSSxnQkFBZ0I7QUFDckQsWUFBUSxJQUFJLGlCQUFpQixJQUFJO0FBQUEsRUFDbkM7QUFFQSxTQUFPO0FBQUEsSUFDUCxTQUFTO0FBQUEsSUFDVCxTQUFTO0FBQUEsTUFDUCxPQUFPO0FBQUEsUUFDTCxLQUFLQyxNQUFLLFFBQVFELFlBQVcsS0FBSztBQUFBLE1BQ3BDO0FBQUEsSUFDRjtBQUFBLElBQ0EsU0FBUyxDQUFDLFlBQVksR0FBRyxzQkFBc0IsQ0FBQztBQUFBO0FBQUEsSUFFaEQsUUFBUSxRQUFRLElBQUksT0FBTyxFQUFFLE1BQU0sT0FBTyxRQUFRLElBQUksSUFBSSxHQUFHLFlBQVksS0FBSyxJQUFJO0FBQUEsSUFDbEYsT0FBTztBQUFBLE1BQ0wsZUFBZTtBQUFBLFFBQ2IsT0FBTztBQUFBLFVBQ0wsTUFBTTtBQUFBLFVBQ04sY0FBYztBQUFBLFVBQ2QsZ0JBQWdCO0FBQUEsVUFDaEIsc0JBQXNCO0FBQUEsVUFDdEIsbUJBQW1CO0FBQUEsUUFDckI7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDQSxDQUFDOyIsCiAgIm5hbWVzIjogWyJwYXRoIiwgImZpbGVVUkxUb1BhdGgiLCAidG9WYXJOYW1lIiwgIl9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwiLCAiX19kaXJuYW1lIiwgInBhdGgiLCAiZmlsZVVSTFRvUGF0aCJdCn0K
