import { describe, it, expect } from 'vitest';
import { formatOutput } from '../src/format';
import { file } from './fixture';

const rendered = (relativePath: string, content: string) => ({
  file: file(relativePath, content),
  content,
});

describe('formatOutput', () => {
  describe('xml', () => {
    it('renders files as xml tags', () => {
      const output = formatOutput(
        [rendered('src/index.ts', 'console.log("hi")')],
        null,
        'xml'
      );
      expect(output).toBe(
        '<file path="src/index.ts">\nconsole.log("hi")\n</file>'
      );
    });

    it('renders multiple files', () => {
      const output = formatOutput(
        [rendered('a.ts', 'aaa'), rendered('b.ts', 'bbb')],
        null,
        'xml'
      );
      expect(output).toContain('<file path="a.ts">');
      expect(output).toContain('<file path="b.ts">');
    });

    it('includes directory when provided', () => {
      const output = formatOutput(
        [rendered('src/index.ts', 'code')],
        'project/\n    src/\n        index.ts',
        'xml'
      );
      expect(output).toMatch(
        /^<directory>\nproject\/\n    src\/\n        index\.ts\n<\/directory>/
      );
      expect(output).toContain('<file path="src/index.ts">');
    });

    it('omits directory tag when null', () => {
      const output = formatOutput([rendered('a.ts', 'x')], null, 'xml');
      expect(output).not.toContain('<directory>');
    });
  });

  describe('json', () => {
    it('renders files as JSON with path, size, content', () => {
      const output = formatOutput(
        [rendered('src/index.ts', 'hello')],
        null,
        'json'
      );
      const parsed = JSON.parse(output);
      expect(parsed.files).toHaveLength(1);
      expect(parsed.files[0].path).toBe('src/index.ts');
      expect(parsed.files[0].content).toBe('hello');
      expect(parsed.files[0].size).toBe(Buffer.byteLength('hello'));
    });

    it('includes directory field when provided', () => {
      const output = formatOutput(
        [rendered('a.ts', 'x')],
        'project/\n    a.ts',
        'json'
      );
      const parsed = JSON.parse(output);
      expect(parsed.directory).toBe('project/\n    a.ts');
    });

    it('omits directory field when null', () => {
      const output = formatOutput([rendered('a.ts', 'x')], null, 'json');
      const parsed = JSON.parse(output);
      expect(parsed).not.toHaveProperty('directory');
    });

    it('renders multiple files', () => {
      const output = formatOutput(
        [rendered('a.ts', 'aaa'), rendered('b.py', 'bbb')],
        null,
        'json'
      );
      const parsed = JSON.parse(output);
      expect(parsed.files).toHaveLength(2);
      expect(parsed.files[0].path).toBe('a.ts');
      expect(parsed.files[1].path).toBe('b.py');
    });
  });

  describe('markdown', () => {
    it('renders files as fenced code blocks with language', () => {
      const output = formatOutput(
        [rendered('src/index.ts', 'const x = 1;')],
        null,
        'markdown'
      );
      expect(output).toContain('`src/index.ts`');
      expect(output).toContain('```ts\nconst x = 1;\n```');
    });

    it('maps known extensions to languages', () => {
      const output = formatOutput(
        [rendered('app.tsx', 'jsx code')],
        null,
        'markdown'
      );
      expect(output).toContain('```tsx');
    });

    it('uses extension as fallback language', () => {
      const output = formatOutput(
        [rendered('script.py', 'print(1)')],
        null,
        'markdown'
      );
      expect(output).toContain('```py');
    });

    it('includes directory as plain code block when provided', () => {
      const output = formatOutput(
        [rendered('a.ts', 'x')],
        'project/\n    a.ts',
        'markdown'
      );
      expect(output).toMatch(/^```\nproject\/\n    a\.ts\n```/);
    });

    it('omits directory block when null', () => {
      const output = formatOutput([rendered('a.ts', 'x')], null, 'markdown');
      expect(output).not.toMatch(/^```\n/);
    });

    it('handles LANG_MAP overrides like .sh -> bash', () => {
      const output = formatOutput(
        [rendered('run.sh', 'echo hi')],
        null,
        'markdown'
      );
      expect(output).toContain('```bash');
    });
  });
});
