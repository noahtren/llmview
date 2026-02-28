import { describe, it, expect, afterEach } from 'vitest';
import { renderTree, renderFiles } from '../src/render';
import { INDENT_CHAR } from '../src/constants';
import { file, dir, toDiskTmp, cleanupDisk } from './fixture';

describe('renderTree', () => {
  it('renders a flat list of files', () => {
    const root = dir('', [file('a.ts'), file('b.ts')]);
    const treePaths = new Set(['a.ts', 'b.ts']);

    const output = renderTree(root, treePaths, 'myproject');
    expect(output).toBe(`myproject/\n${INDENT_CHAR}a.ts\n${INDENT_CHAR}b.ts`);
  });

  it('renders nested directories', () => {
    const root = dir('', [dir('src', [file('src/index.ts')])]);
    const treePaths = new Set(['src', 'src/index.ts']);

    const output = renderTree(root, treePaths, 'proj');
    expect(output).toBe(
      `proj/\n${INDENT_CHAR}src/\n${INDENT_CHAR}${INDENT_CHAR}index.ts`
    );
  });

  it('filters children not in treePaths', () => {
    const root = dir('', [
      dir('src', [file('src/a.ts'), file('src/b.ts')]),
      dir('test', [file('test/t.ts')]),
    ]);
    // Only include src/a.ts and its parents
    const treePaths = new Set(['src', 'src/a.ts']);

    const output = renderTree(root, treePaths, 'proj');
    expect(output).toContain('src/');
    expect(output).toContain('a.ts');
    expect(output).not.toContain('b.ts');
    expect(output).not.toContain('test');
  });

  it('renders deeply nested paths', () => {
    const root = dir('', [
      dir('a', [dir('a/b', [dir('a/b/c', [file('a/b/c/deep.ts')])])]),
    ]);
    const treePaths = new Set(['a', 'a/b', 'a/b/c', 'a/b/c/deep.ts']);

    const output = renderTree(root, treePaths, 'proj');
    const lines = output.split('\n');
    expect(lines).toHaveLength(5);
    expect(lines[4]).toBe(`${INDENT_CHAR.repeat(4)}deep.ts`);
  });

  it('renders empty directory with no children output', () => {
    const root = dir('', [dir('empty')]);
    const treePaths = new Set(['empty']);

    const output = renderTree(root, treePaths, 'proj');
    expect(output).toBe(`proj/\n${INDENT_CHAR}empty/`);
  });
});

describe('renderFiles', () => {
  afterEach(cleanupDisk);

  it('reads file content from disk', async () => {
    const projectPath = await toDiskTmp(dir('', [file('hello.txt', 'world')]));

    const result = await renderFiles(
      projectPath,
      [file('hello.txt', 'world')],
      {}
    );

    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('world');
    expect(result[0].file.relativePath).toBe('hello.txt');
  });

  it('adds line numbers when option is set', async () => {
    const projectPath = await toDiskTmp(
      dir('', [file('code.ts', 'line1\nline2\nline3')])
    );

    const result = await renderFiles(
      projectPath,
      [file('code.ts', 'line1\nline2\nline3')],
      { lineNumbers: true }
    );

    expect(result[0].content).toContain('1\tline1');
    expect(result[0].content).toContain('2\tline2');
    expect(result[0].content).toContain('3\tline3');
  });

  it('excludes binary files', async () => {
    const binaryContent = Buffer.from([0x00, 0x01, 0x02]).toString();
    const projectPath = await toDiskTmp(
      dir('', [file('image.bin', binaryContent)])
    );

    const result = await renderFiles(
      projectPath,
      [file('image.bin', binaryContent)],
      {}
    );

    expect(result[0].content).toContain('binary file');
  });

  it('truncates CSV files', async () => {
    const lines = ['col_a,col_b'];
    for (let i = 0; i < 20; i++) {
      lines.push(`${i},${i * 2}`);
    }
    const csvContent = lines.join('\n');
    const projectPath = await toDiskTmp(
      dir('', [file('data.csv', csvContent)])
    );

    const result = await renderFiles(
      projectPath,
      [file('data.csv', csvContent)],
      {}
    );

    expect(result[0].content).toContain('col_a,col_b');
    expect(result[0].content).toContain('... (more rows)');
    // Should have header + 10 data lines = 11 lines before the "more rows" marker
    const contentLines = result[0].content.split('\n');
    const dataLines = contentLines.filter(
      (l) => !l.includes('... (more rows)')
    );
    expect(dataLines).toHaveLength(10);
  });

  it('does not truncate small CSV files', async () => {
    const csvContent = 'a,b\n1,2\n3,4';
    const projectPath = await toDiskTmp(
      dir('', [file('small.csv', csvContent)])
    );

    const result = await renderFiles(
      projectPath,
      [file('small.csv', csvContent)],
      {}
    );

    expect(result[0].content).not.toContain('... (more rows)');
    expect(result[0].content).toBe(csvContent);
  });

  it('excludes files exceeding size limit', async () => {
    const bigContent = 'x'.repeat(260 * 1024);
    const projectPath = await toDiskTmp(
      dir('', [file('huge.txt', bigContent)])
    );

    const result = await renderFiles(
      projectPath,
      [file('huge.txt', bigContent)],
      {}
    );

    expect(result[0].content).toContain('exceeds');
    expect(result[0].content).toContain('250KB limit');
  });

  it('renders multiple files concurrently', async () => {
    const projectPath = await toDiskTmp(
      dir('', [file('a.ts', 'aaa'), file('b.ts', 'bbb'), file('c.ts', 'ccc')])
    );

    const result = await renderFiles(
      projectPath,
      [file('a.ts', 'aaa'), file('b.ts', 'bbb'), file('c.ts', 'ccc')],
      {}
    );

    expect(result).toHaveLength(3);
    expect(result.map((r) => r.content)).toEqual(['aaa', 'bbb', 'ccc']);
  });
});
