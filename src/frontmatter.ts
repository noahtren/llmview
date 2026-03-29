import { parse as parseYaml } from 'yaml';

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export type Frontmatter = Record<string, unknown>;

export type ParsedFile = {
  frontmatter: Frontmatter | null;
  body: string;
};

export const parseFrontmatter = (content: string): ParsedFile => {
  const match = FRONTMATTER_RE.exec(content);

  if (!match) {
    return { frontmatter: null, body: content };
  }

  const raw = parseYaml(match[1]);

  // Only treat it as frontmatter if it parses to an object (not a scalar or array)
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { frontmatter: null, body: content };
  }

  return {
    frontmatter: raw as Frontmatter,
    body: content.slice(match[0].length),
  };
};
