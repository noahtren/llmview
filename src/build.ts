import * as fs from 'fs/promises';
import * as path from 'path';

import {
  FileSystemNode,
  RootDirectoryNode,
  DirectoryNode,
  FileNode,
  ScopedIgnore,
} from './types';
import { createIgnore, createIgnoreFromFile, isPathIgnored } from './ignore';
import { BASE_IGNORE_CONTENT } from './constants';

export const buildDirectory = async (
  projectPath: string
): Promise<RootDirectoryNode> => {
  const ignores: ScopedIgnore[] = [
    { ig: createIgnore(BASE_IGNORE_CONTENT), scope: '' },
  ];

  const rootGitignore = await createIgnoreFromFile(
    path.join(projectPath, '.gitignore')
  );
  if (rootGitignore) {
    ignores.push({ ig: rootGitignore, scope: '' });
  }

  const stat = await fs.stat(projectPath);
  const rootNode: RootDirectoryNode = {
    ino: stat.ino,
    name: path.basename(projectPath),
    relativePath: '',
    createdAt: stat.birthtime,
    updatedAt: stat.mtime,
    type: 'directory',
    rootPath: projectPath,
    children: [],
  };

  rootNode.children = await buildChildrenNodes(projectPath, rootNode, ignores);
  return rootNode;
};

const buildChildrenNodes = async (
  rootPath: string,
  parentNode: DirectoryNode,
  ignores: ScopedIgnore[]
): Promise<FileSystemNode[]> => {
  const currentPath = path.join(rootPath, parentNode.relativePath);
  const entries = await fs.readdir(currentPath);
  const nodes: FileSystemNode[] = [];

  for (const entry of entries) {
    const entryFullPath = path.join(currentPath, entry);
    const lstat = await fs.lstat(entryFullPath);
    if (lstat.isSymbolicLink()) {
      continue;
    }
    const isDirectory = lstat.isDirectory();
    const nodeRelativePath = parentNode.relativePath
      ? `${parentNode.relativePath}/${entry}`
      : entry;

    if (isPathIgnored(nodeRelativePath, isDirectory, ignores)) {
      continue;
    }

    const nodeBase = {
      ino: lstat.ino,
      name: entry,
      relativePath: nodeRelativePath,
      createdAt: lstat.birthtime,
      updatedAt: lstat.mtime,
    };

    if (isDirectory) {
      const dirNode: DirectoryNode = {
        ...nodeBase,
        type: 'directory',
        children: [],
      };

      const nestedIg = await createIgnoreFromFile(
        path.join(entryFullPath, '.gitignore')
      );
      const childIgnores = nestedIg
        ? [...ignores, { ig: nestedIg, scope: nodeRelativePath }]
        : ignores;

      dirNode.children = await buildChildrenNodes(
        rootPath,
        dirNode,
        childIgnores
      );
      nodes.push(dirNode);
    } else {
      const fileNode: FileNode = {
        ...nodeBase,
        type: 'file',
        size: lstat.size,
      };
      nodes.push(fileNode);
    }
  }

  return nodes.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
};
