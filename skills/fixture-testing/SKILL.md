---
name: fixture-testing
description: How to write fixture-based tests for llmview using the in-memory tree helpers and temporary disk fixtures. Use this skill whenever writing, editing, or debugging tests — including unit tests for scan/select/render/format and integration tests that need a real filesystem. Also use when the user asks about testing patterns, test fixtures, or wants to add test coverage for a new feature.
---

# Fixture-based testing

llmview tests use [vitest](https://vitest.dev/) and a set of fixture helpers in `test/fixture.ts` that let you build virtual project trees either in-memory or on disk.

## Core helpers

### `file(relativePath, content)` → `FileNode`

Creates a file node with the given path and content. The `size` field is computed from `content`:

```typescript
import { file } from './fixture';

const f = file('src/index.ts', 'console.log("hi")');
// { relativePath: 'src/index.ts', type: 'file', size: 21 }
```

### `dir(relativePath, children)` → `DirectoryNode`

Creates a directory node containing child files and directories. The root node uses `''` as its path:

```typescript
import { file, dir } from './fixture';

const tree = dir('', [
  dir('src', [
    file('src/index.ts', 'console.log("hi")'),
    file('src/util.ts', 'export const add = (a, b) => a + b;'),
  ]),
  file('README.md', '# My Project'),
]);
```

Note that child paths must include the full relative path (e.g., `src/index.ts`, not just `index.ts`). This matches the `relativePath` convention used throughout the codebase.

### `toDiskTmp(tree)` → `Promise<string>`

Writes an in-memory tree to a real temporary directory on disk and returns the path. This is required for tests that go through `scanDirectory`, `renderFiles`, or `execute` — anything that reads from the filesystem:

```typescript
const projectPath = await toDiskTmp(tree);
```

### `cleanupDisk()`

Removes all temporary directories created by `toDiskTmp`. Always call this in `afterEach`:

```typescript
afterEach(cleanupDisk);
```

## Test patterns

### Unit testing: select / format (in-memory)

For `selectFiles` and `formatOutput`, you can build trees in memory without touching disk. These tests are fast and deterministic:

```typescript
import { describe, it, expect } from 'vitest';
import { selectFiles } from '../src/select';
import { formatOutput } from '../src/format';
import { file, dir } from './fixture';

describe('selectFiles', () => {
  it('matches glob patterns', () => {
    const tree = dir('', [
      dir('src', [file('src/app.ts', ''), file('src/util.ts', '')]),
      file('README.md', ''),
    ]);

    const selected = selectFiles(tree, ['src/**']);
    expect(selected.map((f) => f.relativePath)).toEqual([
      'src/app.ts',
      'src/util.ts',
    ]);
  });

  it('supports negation patterns', () => {
    const tree = dir('', [
      dir('src', [file('src/app.ts', ''), file('src/generated.ts', '')]),
    ]);

    const selected = selectFiles(tree, ['src/**', '!src/generated.ts']);
    expect(selected.map((f) => f.relativePath)).toEqual(['src/app.ts']);
  });
});
```

For `formatOutput`, build `RenderedFile[]` objects directly — you don't need real files:

```typescript
const rendered = (relativePath: string, content: string) => ({
  file: {
    relativePath,
    type: 'file' as const,
    size: Buffer.byteLength(content),
  },
  content,
});

it('renders xml', () => {
  const { output } = formatOutput(
    [rendered('src/index.ts', 'console.log("hi")')],
    null,
    'xml'
  );
  expect(output).toContain('<file path="src/index.ts">');
});
```

### Integration testing: scan → select → render → format (on disk)

When you need the full pipeline — scanning a real directory, rendering file contents, applying render rules — use `toDiskTmp`:

```typescript
import { describe, it, expect, afterEach } from 'vitest';
import { scanDirectory } from '../src/scan';
import { selectFiles } from '../src/select';
import { renderFiles } from '../src/render';
import { formatOutput } from '../src/format';
import { execute } from '../src/execute';
import { toDiskTmp, cleanupDisk } from './fixture';
import { file, dir } from './fixture';

describe('integration', () => {
  afterEach(cleanupDisk);

  it('renders a project end to end', async () => {
    const tree = dir('', [dir('src', [file('src/app.py', 'print("hello")')])]);

    const projectPath = await toDiskTmp(tree);
    const root = await scanDirectory(projectPath);
    const selected = selectFiles(root, ['src/**']);
    const rendered = await renderFiles(projectPath, selected, {});
    const { output } = formatOutput(rendered, null, 'xml');

    expect(output).toContain('<file path="src/app.py">');
    expect(output).toContain('print("hello")');
  });
});
```

### Using `execute` directly

For higher-level tests, `execute` bundles the full pipeline and returns structured results:

```typescript
it('renders tree only', async () => {
  const projectPath = await toDiskTmp(tree);
  const { output, renderedFiles } = await execute(projectPath, {
    globs: ['src/**'],
    treeOnly: true,
    tree: true,
  });

  expect(renderedFiles).toBeNull();
  expect(output).toContain('<directory>');
  expect(output).not.toContain('<file');
});

it('renders files by default', async () => {
  const projectPath = await toDiskTmp(tree);
  const { output } = await execute(projectPath, { globs: ['src/**'] });

  expect(output).not.toContain('<directory>');
  expect(output).toContain('<file path="src/app.py">');
});
```

### Defining reusable example projects

For complex fixtures used across multiple test files, define them in a separate module (see `test/flask-app-example.ts`):

```typescript
// test/my-example.ts
import { file, dir } from './fixture';

export const flaskApp = `from flask import Flask
app = Flask(__name__)`;

export const projectTree = dir('', [
  dir('backend', [
    dir('backend/migrations', [
      file('backend/migrations/001_init.sql', 'CREATE TABLE users;'),
    ]),
    file('backend/main.py', flaskApp),
  ]),
  dir('docs', [
    file('docs/style_guide.md', '# Style guide\n\nMake no mistakes'),
  ]),
]);

export const patterns = [
  'backend/**',
  '!backend/migrations/**',
  'docs/style_guide.md',
];
```

Then import and use in tests:

```typescript
import { projectTree, patterns } from './my-example';

it('excludes migrations', async () => {
  const projectPath = await toDiskTmp(projectTree);
  const root = await scanDirectory(projectPath);
  const selected = selectFiles(root, patterns);

  const paths = selected.map((f) => f.relativePath);
  expect(paths).toContain('backend/main.py');
  expect(paths).not.toContain('backend/migrations/001_init.sql');
});
```

## Testing render rules

Render rules (binary guard, CSV preview, frontmatter) are tested through `renderFiles`, which requires disk:

```typescript
it('truncates CSV files', async () => {
  const csvContent = Array.from(
    { length: 20 },
    (_, i) => `col1,col2\nrow${i},val${i}`
  ).join('\n');
  const tree = dir('', [file('data.csv', csvContent)]);

  const projectPath = await toDiskTmp(tree);
  const root = await scanDirectory(projectPath);
  const selected = selectFiles(root, ['**']);
  const rendered = await renderFiles(projectPath, selected, {});

  expect(rendered[0].content).toContain('... (more rows)');
});

it('extracts frontmatter from markdown', async () => {
  const md = '---\ntitle: Hello\n---\n\nBody text';
  const tree = dir('', [file('doc.md', md)]);

  const projectPath = await toDiskTmp(tree);
  const root = await scanDirectory(projectPath);
  const selected = selectFiles(root, ['**']);
  const rendered = await renderFiles(projectPath, selected, {});

  expect(rendered[0].frontmatter).toEqual({ title: 'Hello' });
  expect(rendered[0].content).toBe('\nBody text');
});
```

## Running tests

```bash
npm test              # run all tests once
npx vitest            # watch mode
npx vitest run scan   # run only scan.test.ts
```
