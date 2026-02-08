import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { scanDirectory } from '../src/scan';
import { FileNode, DirectoryNode } from '../src/types';
import {
  file,
  dir,
  toDiskTmp,
  cleanupDisk,
  collectPaths,
  findNode,
} from './fixture';

describe('buildDirectory', () => {
  afterEach(cleanupDisk);

  it('builds a basic tree with files and directories', async () => {
    const projectPath = await toDiskTmp(
      dir('', [
        dir('src', [
          file('src/index.ts', 'console.log("hi")'),
          file(
            'src/utils.ts',
            'export const add = (a: number, b: number) => a + b;'
          ),
        ]),
        file('README.md', '# Hello'),
      ])
    );

    const root = await scanDirectory(projectPath);

    expect(root.type).toBe('directory');
    expect(root.relativePath).toBe('');
    expect(collectPaths(root)).toEqual([
      'src/index.ts',
      'src/utils.ts',
      'README.md',
    ]);
  });

  it('sorts directories before files at each level', async () => {
    const projectPath = await toDiskTmp(
      dir('', [
        file('z-file.txt', 'z'),
        file('a-file.txt', 'a'),
        dir('beta', [file('beta/inner.txt', 'inner')]),
        dir('alpha', [file('alpha/inner.txt', 'inner')]),
      ])
    );

    const root = await scanDirectory(projectPath);
    const topLevelNames = root.children.map((c) => c.name);

    expect(topLevelNames).toEqual([
      'alpha',
      'beta',
      'a-file.txt',
      'z-file.txt',
    ]);
  });

  it('excludes base-ignored entries (.git, node_modules, .DS_Store, __pycache__)', async () => {
    const projectPath = await toDiskTmp(
      dir('', [
        dir('.git', [file('.git/HEAD', 'ref: refs/heads/main')]),
        dir('node_modules', [
          dir('node_modules/lodash', [file('node_modules/lodash/index.js')]),
        ]),
        dir('__pycache__', [file('__pycache__/mod.cpython-311.pyc')]),
        file('.DS_Store'),
        file('app.ts', 'console.log("app")'),
      ])
    );

    const root = await scanDirectory(projectPath);

    expect(collectPaths(root)).toEqual(['app.ts']);
  });

  it('respects root .gitignore', async () => {
    const projectPath = await toDiskTmp(
      dir('', [
        file('.gitignore', 'dist/\n*.log'),
        dir('dist', [file('dist/bundle.js', 'bundled')]),
        file('error.log', 'some error'),
        file('app.ts', 'console.log("app")'),
      ])
    );

    const root = await scanDirectory(projectPath);
    const paths = collectPaths(root);

    expect(paths).toContain('.gitignore');
    expect(paths).toContain('app.ts');
    expect(paths).not.toContain('dist/bundle.js');
    expect(paths).not.toContain('error.log');
  });

  it('respects nested .gitignore scoped to its directory', async () => {
    const projectPath = await toDiskTmp(
      dir('', [
        dir('src', [
          file('src/.gitignore', '*.generated.ts'),
          file('src/index.ts', 'export {}'),
          file('src/schema.generated.ts', '// auto-generated'),
        ]),
        file('root.generated.ts', 'keep me'),
      ])
    );

    const root = await scanDirectory(projectPath);
    const paths = collectPaths(root);

    expect(paths).toContain('src/index.ts');
    expect(paths).not.toContain('src/schema.generated.ts');
    expect(paths).toContain('root.generated.ts');
  });

  it('skips symbolic links', async () => {
    const projectPath = await toDiskTmp(
      dir('', [
        dir('src', [file('src/code.ts', 'code')]),
        file('real.txt', 'real content'),
      ])
    );
    await fs.symlink(
      path.join(projectPath, 'real.txt'),
      path.join(projectPath, 'link.txt')
    );

    const root = await scanDirectory(projectPath);
    const paths = collectPaths(root);

    expect(paths).toContain('real.txt');
    expect(paths).not.toContain('link.txt');
  });

  it('populates size on file nodes', async () => {
    const content = 'hello world';
    const projectPath = await toDiskTmp(dir('', [file('file.txt', content)]));

    const root = await scanDirectory(projectPath);
    const fileNode = findNode(root, 'file.txt') as FileNode;

    expect(fileNode).toBeDefined();
    expect(fileNode.size).toBe(Buffer.byteLength(content));
  });

  it('handles empty directories', async () => {
    const projectPath = await toDiskTmp(
      dir('', [file('file.txt', 'content'), dir('empty')])
    );

    const root = await scanDirectory(projectPath);
    const emptyDir = findNode(root, 'empty') as DirectoryNode;

    expect(emptyDir).toBeDefined();
    expect(emptyDir.type).toBe('directory');
    expect(emptyDir.children).toEqual([]);
  });

  it('handles deeply nested structures', async () => {
    const projectPath = await toDiskTmp(
      dir('', [
        dir('a', [
          dir('a/b', [
            dir('a/b/c', [dir('a/b/c/d', [file('a/b/c/d/deep.txt', 'deep')])]),
          ]),
        ]),
      ])
    );

    const root = await scanDirectory(projectPath);

    expect(collectPaths(root)).toEqual(['a/b/c/d/deep.txt']);
  });

  it('handles .gitignore negation patterns', async () => {
    const projectPath = await toDiskTmp(
      dir('', [
        file('.gitignore', '*.env\n!example.env'),
        file('.env', 'SECRET=123'),
        file('example.env', 'SECRET=example'),
        file('app.ts', 'code'),
      ])
    );

    const root = await scanDirectory(projectPath);
    const paths = collectPaths(root);

    expect(paths).not.toContain('.env');
    expect(paths).toContain('example.env');
    expect(paths).toContain('app.ts');
  });

  it('combines root and nested .gitignore rules', async () => {
    const projectPath = await toDiskTmp(
      dir('', [
        file('.gitignore', '*.log'),
        dir('src', [
          file('src/.gitignore', 'tmp/'),
          file('src/index.ts', 'code'),
          file('src/debug.log', 'log'),
          dir('src/tmp', [file('src/tmp/cache.txt', 'cache')]),
        ]),
        file('root.log', 'log'),
      ])
    );

    const root = await scanDirectory(projectPath);
    const paths = collectPaths(root);

    expect(paths).not.toContain('root.log');
    expect(paths).not.toContain('src/debug.log');
    expect(paths).not.toContain('src/tmp/cache.txt');
    expect(paths).toContain('src/index.ts');
  });

  it('handles permission-denied files gracefully', async () => {
    const projectPath = await toDiskTmp(
      dir('', [file('readable.txt', 'hello'), file('forbidden.txt', 'secret')])
    );

    await fs.chmod(path.join(projectPath, 'forbidden.txt'), 0o000);

    const root = await scanDirectory(projectPath);
    const paths = collectPaths(root);

    // lstat doesn't require read permission, so the file should still appear
    expect(paths).toContain('readable.txt');
    expect(paths).toContain('forbidden.txt');
  });

  it('survives a permission-denied directory', async () => {
    const projectPath = await toDiskTmp(
      dir('', [
        dir('locked', [file('locked/inner.txt', 'hidden')]),
        file('visible.txt', 'hi'),
      ])
    );

    await fs.chmod(path.join(projectPath, 'locked'), 0o000);

    const root = await scanDirectory(projectPath);
    const paths = collectPaths(root);

    expect(paths).toContain('visible.txt');
    expect(paths).not.toContain('locked/inner.txt');

    // restore permission so afterEach can delete the temp dir
    await fs.chmod(path.join(projectPath, 'locked'), 0o755);
  });
});
