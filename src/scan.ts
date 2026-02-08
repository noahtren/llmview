import * as fs from 'fs/promises';
import * as path from 'path';
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

  const rootGitignore = await createIgnoreFromFile(
    path.join(projectPath, '.gitignore')
  );
  if (rootGitignore) {
    ignores.push({ ig: rootGitignore, scope: '' });
  }

  const rootNode: DirectoryNode = {
    name: path.basename(projectPath),
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
  rootPath: string,
  parentNode: DirectoryNode,
  ignores: ScopedIgnore[],
  ioLimit: LimitFunction
): Promise<FileSystemNode[]> => {
  const currentPath = path.join(rootPath, parentNode.relativePath);
  const entries = await ioLimit(() => fs.readdir(currentPath));

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
            name: entry,
            relativePath: nodeRelativePath,
            type: 'directory',
            children: [],
          };

          const nestedIg = await ioLimit(() =>
            createIgnoreFromFile(path.join(entryFullPath, '.gitignore'))
          );
          const childIgnores = nestedIg
            ? [...ignores, { ig: nestedIg, scope: nodeRelativePath }]
            : ignores;

          dirNode.children = await scanChildrenNodes(
            rootPath,
            dirNode,
            childIgnores,
            ioLimit
          );
          return dirNode;
        } else {
          return {
            name: entry,
            relativePath: nodeRelativePath,
            type: 'file',
            size: lstat.size,
          };
        }
      } catch {
        return null;
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
    return a.name.localeCompare(b.name);
  });
};
