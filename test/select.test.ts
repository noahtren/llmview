import { describe, it, expect } from 'vitest';
import { selectFiles, getTreePaths } from '../src/select';
import { file, dir } from './fixture';

describe('selectFiles', () => {
  const tree = dir('', [
    dir('src', [
      file('src/index.ts'),
      file('src/utils.ts'),
      dir('src/lib', [file('src/lib/helper.ts')]),
    ]),
    dir('test', [file('test/index.test.ts')]),
    file('README.md'),
    file('package.json'),
  ]);

  it('matches files with simple glob', () => {
    const selectedFiles = selectFiles(tree, ['*.md']);
    expect(selectedFiles.map((f) => f.relativePath)).toEqual(['README.md']);
  });

  it('matches files with ** recursive glob', () => {
    const selectedFiles = selectFiles(tree, ['src/**']);
    expect(selectedFiles.map((f) => f.relativePath)).toEqual([
      'src/index.ts',
      'src/utils.ts',
      'src/lib/helper.ts',
    ]);
  });

  it('matches multiple patterns', () => {
    const selectedFiles = selectFiles(tree, ['*.md', '*.json']);
    expect(selectedFiles.map((f) => f.relativePath)).toEqual([
      'README.md',
      'package.json',
    ]);
  });

  it('excludes files with negation pattern', () => {
    const selectedFiles = selectFiles(tree, ['src/**', '!src/lib/**']);
    expect(selectedFiles.map((f) => f.relativePath)).toEqual([
      'src/index.ts',
      'src/utils.ts',
    ]);
  });

  it('returns empty array when no matches', () => {
    const selectedFiles = selectFiles(tree, ['*.xyz']);
    expect(selectedFiles).toEqual([]);
  });
});

describe('getTreePaths', () => {
  it('includes file paths and all parent directories', () => {
    const files = [file('src/lib/helper.ts')];
    const treePaths = getTreePaths(files);
    expect([...treePaths].sort()).toEqual([
      'src',
      'src/lib',
      'src/lib/helper.ts',
    ]);
  });

  it('dedupes shared parent paths', () => {
    const files = [file('src/lib/a.ts'), file('src/lib/b.ts')];
    const treePaths = getTreePaths(files);
    expect([...treePaths].sort()).toEqual([
      'src',
      'src/lib',
      'src/lib/a.ts',
      'src/lib/b.ts',
    ]);
  });

  it('handles root-level files', () => {
    const files = [file('README.md')];
    const treePaths = getTreePaths(files);
    expect([...treePaths]).toEqual(['README.md']);
  });
});
