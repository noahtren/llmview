import * as path from 'node:path';

import { describe, it, expect, afterEach } from 'vitest';
import { scanDirectory } from '../src/scan';
import { selectFiles, getTreePaths } from '../src/select';
import { renderFiles, renderTree } from '../src/render';
import { formatOutput } from '../src/format';
import { toDiskTmp, cleanupDisk } from './fixture';
import { projectTree, patterns } from './readme-example';

describe('integration: README flask example', () => {
  afterEach(cleanupDisk);

  it('selects the right files (excludes migrations)', async () => {
    const projectPath = await toDiskTmp(projectTree);
    const root = await scanDirectory(projectPath);
    const selected = selectFiles(root, patterns);
    const paths = selected.map((f) => f.relativePath);

    expect(paths).toContain('backend/main.py');
    expect(paths).toContain('docs/style_guide.md');
    expect(paths).not.toContain('backend/migrations/001_init.sql');
  });

  it('produces expected xml output', async () => {
    const projectPath = await toDiskTmp(projectTree);
    const root = await scanDirectory(projectPath);
    const selected = selectFiles(root, patterns);
    const rendered = await renderFiles(projectPath, selected, {});
    const output = formatOutput(rendered, null, 'xml');

    expect(output).toContain('<file path="backend/main.py">');
    expect(output).toContain('from flask import Flask');
    expect(output).toContain('<file path="docs/style_guide.md">');
    expect(output).toContain('Make no mistakes');
    expect(output).not.toContain('migrations');
  });

  it('includes directory tree with -t', async () => {
    const projectPath = await toDiskTmp(projectTree);
    const root = await scanDirectory(projectPath);
    const selected = selectFiles(root, patterns);
    const treePaths = getTreePaths(selected);
    const tree = renderTree(root, treePaths, path.basename(projectPath));
    const rendered = await renderFiles(projectPath, selected, {});
    const output = formatOutput(rendered, tree, 'xml');

    expect(output).toMatch(/^<directory>/);
    expect(output).toContain('backend/');
    expect(output).toContain('main.py');
    expect(output).toContain('docs/');
    expect(output).toContain('style_guide.md');
    expect(output).not.toContain('migrations');
  });

  it('renders markdown format', async () => {
    const projectPath = await toDiskTmp(projectTree);
    const root = await scanDirectory(projectPath);
    const selected = selectFiles(root, patterns);
    const rendered = await renderFiles(projectPath, selected, {});
    const output = formatOutput(rendered, null, 'markdown');

    expect(output).toContain('`backend/main.py`');
    expect(output).toContain('```py');
    expect(output).toContain('`docs/style_guide.md`');
    expect(output).toContain('```md');
  });

  it('renders json format', async () => {
    const projectPath = await toDiskTmp(projectTree);
    const root = await scanDirectory(projectPath);
    const selected = selectFiles(root, patterns);
    const rendered = await renderFiles(projectPath, selected, {});
    const output = formatOutput(rendered, null, 'json');
    const parsed = JSON.parse(output);

    expect(parsed.files).toHaveLength(2);
    expect(parsed.files.map((f: { path: string }) => f.path)).toEqual([
      'backend/main.py',
      'docs/style_guide.md',
    ]);
  });
});
