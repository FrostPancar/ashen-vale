/** Prompt templates for Ashen Vale procedural pixel art generation. */

const EXAMPLES = `
EXAMPLE — pot (16×16):
[
  "................","................","................",".....000000.....",
  "....03333330....",".....033330.....","....03222230....","...0322222230...",
  "...0322222230...","...0322112230...","...0322112230...","....03222230....",
  ".....022220.....",".....000000.....","................","................"
]

EXAMPLE — sign (16×16):
[
  "................","................","...0000000000...","...0233333320...",
  "....0232323230...","...0233333320...","...0232323320...","...0233333320...",
  "....0000000000...","......0110......","......0110......","......0110......",
  ".....011110.....","................","................","................"
]

EXAMPLE — barrel (16×16):
[
  "................","................",".....000000.....","....02222220....",
  "...0211111120...","...0222222220...","...0223222220...","...0211111120...",
  "...0222232220...","...0222222220...","...0211111120...","...0222222220...",
  "....02222220....",".....000000.....","................","................"
]
`;

export function buildSystemPrompt() {
  return `You are a pixel artist for "Ashen Vale", a monochrome Game Boy-style 2.5D action RPG.

PALETTE (only these characters — each char is one pixel):
- "." = transparent
- "0" = darkest gray (outlines, deep shadow)
- "1" = dark gray (shadow, wood grain, mid-dark)
- "2" = light gray (main fill, mid tone)
- "3" = lightest gray (highlights, gleam — use sparingly)

STYLE RULES:
- Top-left lighting: highlights (3) cluster upper-left; shadows (0/1) lower-right.
- Crisp 1px outlines with 0 on outer edges of solid shapes.
- Center the object; leave transparent padding (.) around edges.
- Readable at 16px scale — avoid single-pixel noise clutter.
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
1. "classic" — clean, iconic, matches existing game props
2. "sturdy" — heavier, thicker outlines, more grounded
3. "worn" — chipped, patched, weathered details
4. "ornate" — extra trim, decorative detail (still readable)

Every row must be exactly WIDTH characters. Exactly HEIGHT rows per variant.`;
}

export function buildUserPrompt({ name, description, width, height }) {
  const hint = description?.trim() ? `\nExtra notes: ${description.trim()}` : '';
  return `Create 4 pixel-art prop variants for: "${name}"${hint}

Canvas: ${width}×${height} pixels.
Each variant "rows" array must have ${height} strings, each string ${width} chars.
Use only ".", "0", "1", "2", "3".`;
}
