import path from 'path';
import { fileURLToPath } from 'url';
import { Agent, CursorAgentError } from '@cursor/sdk';
import { buildSystemPrompt, buildUserPrompt } from './prompt.js';
import { countPixels, formatJsConst, sanitizeRows } from './validate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

const DEFAULT_MODEL = 'composer-2.5-fast';
const MIN_PIXELS = 12;

export function resolveApiKey(bodyKey) {
  return bodyKey?.trim() || process.env.CURSOR_API_KEY?.trim() || '';
}

function extractJson(text) {
  const raw = String(text || '').trim();
  if (!raw) throw new Error('Empty response from model');

  try {
    return JSON.parse(raw);
  } catch { /* continue */ }

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch { /* continue */ }
  }

  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(raw.slice(start, end + 1));
    } catch { /* continue */ }
  }

  throw new Error('Model returned invalid JSON — try again');
}

async function callCursorAgent({ apiKey, model, name, description, width, height }) {
  const prompt = [
    buildSystemPrompt(),
    '',
    '---',
    '',
    buildUserPrompt({ name, description, width, height }),
    '',
    'Reply with ONLY the JSON object. No markdown fences, no explanation.',
  ].join('\n');

  let result;
  try {
    result = await Agent.prompt(prompt, {
      apiKey,
      model: { id: model || DEFAULT_MODEL },
      local: { cwd: REPO_ROOT, settingSources: [] },
    });
  } catch (err) {
    if (err instanceof CursorAgentError) {
      throw new Error(err.message || 'Cursor agent failed to start');
    }
    throw err;
  }

  if (result.status === 'error') {
    throw new Error('Generation run failed — try again');
  }

  const text = typeof result.result === 'string'
    ? result.result
    : result.result?.text || result.result?.content || '';

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
    const description = String(v.description || `${name} — ${label}`).slice(0, 120);
    const suffix = i === 0 ? '' : `_${label.replace(/[^a-zA-Z0-9]+/g, '_').toLowerCase()}`;

    out.push({
      id: i + 1,
      label,
      description,
      rows,
      pixels,
      width,
      height,
      jsCode: formatJsConst(`${name}${suffix}`, rows, `${width}×${height} — ${description}`),
      asciiBlock: rows.join('\n'),
    });
  }

  if (out.length === 0) throw new Error('No valid sprites in model response — try again');
  return out;
}

export async function generatePixelArt(body) {
  const name = String(body?.name || '').trim();
  if (!name) throw new Error('Object name is required');

  const width = Math.min(48, Math.max(8, Number(body?.width) || 16));
  const height = Math.min(48, Math.max(8, Number(body?.height) || 16));
  const description = String(body?.description || '');
  const model = String(body?.model || DEFAULT_MODEL);
  const apiKey = resolveApiKey(body?.apiKey);

  if (!apiKey) {
    throw new Error(
      'No Cursor API key. Set CURSOR_API_KEY in .env (uses your subscription credits) or paste a key from cursor.com/dashboard → Integrations.'
    );
  }

  const parsed = await callCursorAgent({ apiKey, model, name, description, width, height });
  const variants = normalizeVariants(parsed, { name, width, height });

  return {
    name,
    width,
    height,
    model,
    provider: 'cursor',
    variants,
    usage: {
      register: `this.props.${toPropKey(name)} = asciiCanvas(${toVarName(name)});`,
    },
  };
}

function toVarName(name) {
  const base = String(name).trim().replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toUpperCase();
  return base || 'PROP';
}

function toPropKey(name) {
  return String(name).trim().replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'prop';
}
