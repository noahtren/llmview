import { describe, it, expect } from 'vitest';
import { parseFrontmatter } from '../src/frontmatter';
import { formatOutput } from '../src/format';
import { RenderedFile } from '../src/types';

describe('parseFrontmatter', () => {
  it('parses simple key-value frontmatter', () => {
    const input = `---
name: my-skill
description: A cool skill
---
# Body content here`;

    const result = parseFrontmatter(input);
    expect(result.frontmatter).toEqual({
      name: 'my-skill',
      description: 'A cool skill',
    });
    expect(result.body).toBe('# Body content here');
  });

  it('returns null frontmatter when none present', () => {
    const input = '# Just a markdown file\n\nNo frontmatter here.';
    const result = parseFrontmatter(input);
    expect(result.frontmatter).toBeNull();
    expect(result.body).toBe(input);
  });

  it('handles quoted string values', () => {
    const input = `---
name: "quoted value"
other: 'single quoted'
---
body`;

    const result = parseFrontmatter(input);
    expect(result.frontmatter).toEqual({
      name: 'quoted value',
      other: 'single quoted',
    });
  });

  it('handles boolean and numeric values', () => {
    const input = `---
enabled: true
disabled: false
version: 2
weight: 3.14
---
body`;

    const result = parseFrontmatter(input);
    expect(result.frontmatter?.enabled).toBe(true);
    expect(result.frontmatter?.disabled).toBe(false);
    expect(result.frontmatter?.version).toBe(2);
    expect(result.frontmatter?.weight).toBe(3.14);
  });

  it('handles null and empty values', () => {
    const input = `---
empty:
explicit_null: null
tilde: ~
---
body`;

    const result = parseFrontmatter(input);
    expect(result.frontmatter?.empty).toBeNull();
    expect(result.frontmatter?.explicit_null).toBeNull();
    expect(result.frontmatter?.tilde).toBeNull();
  });

  it('handles multi-line description', () => {
    const input = `---
name: test
description: >
  A long description
  that spans multiple lines
---
body`;

    const result = parseFrontmatter(input);
    expect(result.frontmatter?.description).toContain('A long description');
    expect(result.frontmatter?.description).toContain('multiple lines');
  });

  it('handles colons in values', () => {
    const input = `---
description: "Use when the user asks: do this thing"
---
body`;

    const result = parseFrontmatter(input);
    expect(result.frontmatter?.description).toBe(
      'Use when the user asks: do this thing'
    );
  });

  it('rejects non-object frontmatter (bare scalar)', () => {
    const input = `---
just a string
---
body`;

    const result = parseFrontmatter(input);
    expect(result.frontmatter).toBeNull();
    expect(result.body).toBe(input);
  });
});

const rendered = (
  relativePath: string,
  content: string,
  frontmatter?: Record<string, unknown> | null
): RenderedFile => ({
  file: { relativePath, type: 'file', size: content.length },
  content,
  ...(frontmatter !== undefined && { frontmatter }),
});

describe('formatOutput with frontmatter', () => {
  describe('xml', () => {
    it('includes frontmatter element when present', () => {
      const { output } = formatOutput(
        [
          rendered('SKILL.md', '# Instructions', {
            name: 'test',
            description: 'A skill',
          }),
        ],
        null,
        'xml'
      );
      expect(output).toContain('<frontmatter>');
      expect(output).toContain('<name>test</name>');
      expect(output).toContain('<description>A skill</description>');
      expect(output).toContain('# Instructions');
    });

    it('renders self-closing tag when frontmatter-only with empty content', () => {
      const { output } = formatOutput(
        [rendered('SKILL.md', '', { name: 'test' })],
        null,
        'xml'
      );
      expect(output).toContain('<frontmatter>');
      expect(output).toContain('<name>test</name>');
    });

    it('renders normally without frontmatter', () => {
      const { output } = formatOutput(
        [rendered('plain.ts', 'const x = 1;')],
        null,
        'xml'
      );
      expect(output).not.toContain('<frontmatter>');
      expect(output).toContain('const x = 1;');
    });
  });

  describe('json', () => {
    it('includes frontmatter field when present', () => {
      const { output } = formatOutput(
        [rendered('SKILL.md', '# Body', { name: 'test', version: 2 })],
        null,
        'json'
      );
      const parsed = JSON.parse(output);
      expect(parsed.files[0].frontmatter).toEqual({ name: 'test', version: 2 });
      expect(parsed.files[0].content).toBe('# Body');
    });

    it('omits frontmatter field when not present', () => {
      const { output } = formatOutput(
        [rendered('plain.ts', 'code')],
        null,
        'json'
      );
      const parsed = JSON.parse(output);
      expect(parsed.files[0]).not.toHaveProperty('frontmatter');
    });

    it('omits content field when empty (frontmatter-only)', () => {
      const { output } = formatOutput(
        [rendered('SKILL.md', '', { name: 'test' })],
        null,
        'json'
      );
      const parsed = JSON.parse(output);
      expect(parsed.files[0].frontmatter).toEqual({ name: 'test' });
      expect(parsed.files[0]).not.toHaveProperty('content');
    });
  });

  describe('markdown', () => {
    it('includes frontmatter when present', () => {
      const { output } = formatOutput(
        [
          rendered('SKILL.md', '# Body', {
            name: 'test',
            description: 'A skill',
          }),
        ],
        null,
        'markdown'
      );
      expect(output).toContain('name: test');
      expect(output).toContain('description: A skill');
      expect(output).toContain('# Body');
    });

    it('renders normally without frontmatter', () => {
      const { output } = formatOutput(
        [rendered('app.ts', 'code')],
        null,
        'markdown'
      );
      expect(output).not.toContain('name:');
    });
  });
});
