import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import pLimit, { LimitFunction } from 'p-limit';
import { FileSystemNode, DirectoryNode, ScopedIgnore } from './types';
import { createIgnore, createIgnoreFromFile, isPathIgnored } from './ignore';
import { BASE_IGNORE_CONTENT, MAX_OPEN_FILES } from './constants';

export const scanDirectory = async (
  projectPath: string
): Promise<DirectoryNode> => {
  const ioLimit = pLimit(MAX_OPEN_FILES);

  const ignores: ScopedIgnore[] = [
    { ig: createIgnore(BASE_IGNORE_CONTENT), scope: '' },
  ];

  const rootNode: DirectoryNode = {
    relativePath: '',
    type: 'directory',
    children: [],
  };

  rootNode.children = await scanChildrenNodes(
    projectPath,
    rootNode,
    ignores,
    ioLimit
  );
  return rootNode;
};

const scanChildrenNodes = async (
  projectPath: string,
  parentNode: DirectoryNode,
  ignores: ScopedIgnore[],
  ioLimit: LimitFunction
): Promise<FileSystemNode[]> => {
  const currentPath = path.join(projectPath, parentNode.relativePath);
  const entries = await ioLimit(() => fs.readdir(currentPath));

  if (entries.includes('.gitignore')) {
    const ig = await ioLimit(() =>
      createIgnoreFromFile(path.join(currentPath, '.gitignore'))
    );
    if (ig) {
      ignores = [...ignores, { ig, scope: parentNode.relativePath }];
    }
  }

  const results = await Promise.all(
    entries.map(async (entry): Promise<FileSystemNode | null> => {
      try {
        const entryFullPath = path.join(currentPath, entry);
        const lstat = await ioLimit(() => fs.lstat(entryFullPath));
        if (lstat.isSymbolicLink()) {
          return null;
        }
        const isDirectory = lstat.isDirectory();
        const nodeRelativePath = parentNode.relativePath
          ? `${parentNode.relativePath}/${entry}`
          : entry;

        if (isPathIgnored(nodeRelativePath, isDirectory, ignores)) {
          return null;
        }

        if (isDirectory) {
          const dirNode: DirectoryNode = {
            relativePath: nodeRelativePath,
            type: 'directory',
            children: [],
          };

          dirNode.children = await scanChildrenNodes(
            projectPath,
            dirNode,
            ignores,
            ioLimit
          );
          return dirNode;
        } else {
          return {
            relativePath: nodeRelativePath,
            type: 'file',
            size: lstat.size,
          };
        }
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code === 'EACCES' || code === 'EPERM') {
          return null;
        }
        throw err;
      }
    })
  );

  const nodes = results.filter((n): n is FileSystemNode => n !== null);

  // Sort children so directories appear before sibling files (IDE-like).
  // This also ensures determinism for prompt caching.
  return nodes.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }
    return path
      .basename(a.relativePath)
      .localeCompare(path.basename(b.relativePath));
  });
};
