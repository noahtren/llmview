import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

import { DirectoryNode, FileNode, FileSystemNode } from '../src/types';

// ── node builders ────────────────────────────────────────────────────

const fileContents = new WeakMap<FileNode, string>();

export const file = (relativePath: string, content: string = ''): FileNode => {
  const node: FileNode = {
    relativePath,
    type: 'file',
    size: Buffer.byteLength(content),
  };
  fileContents.set(node, content);
  return node;
};

export const dir = (
  relativePath: string,
  children: FileSystemNode[] = []
): DirectoryNode => ({
  relativePath,
  type: 'directory',
  children,
});

// ── materialize to disk ──────────────────────────────────────────────

const tmpDirs: string[] = [];

export const toDiskTmp = async (root: DirectoryNode): Promise<string> => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'llmview-test-'));
  tmpDirs.push(tmpDir);

  const writeNode = async (node: FileSystemNode): Promise<void> => {
    const fullPath = path.join(tmpDir, node.relativePath);
    if (node.type === 'directory') {
      if (node.relativePath !== '') {
        await fs.mkdir(fullPath, { recursive: true });
      }
      for (const child of node.children) {
        await writeNode(child);
      }
    } else {
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, fileContents.get(node) ?? '');
    }
  };

  await writeNode(root);
  return tmpDir;
};

export const cleanupDisk = async (): Promise<void> => {
  await Promise.all(
    tmpDirs.map((d) => fs.rm(d, { recursive: true, force: true }))
  );
  tmpDirs.length = 0;
};

// ── tree query helpers ───────────────────────────────────────────────

export const collectPaths = (node: FileSystemNode): string[] => {
  if (node.type === 'file') return [node.relativePath];
  return node.children.flatMap(collectPaths);
};

export const findNode = (
  root: DirectoryNode,
  relativePath: string
): FileSystemNode | undefined => {
  for (const child of root.children) {
    if (child.relativePath === relativePath) return child;
    if (child.type === 'directory') {
      const found = findNode(child, relativePath);
      if (found) return found;
    }
  }
  return undefined;
};
