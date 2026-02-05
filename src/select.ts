import { DirectoryNode, FileNode } from './types';
import { minimatch } from 'minimatch';

export const selectFiles = (
  node: DirectoryNode,
  globPatterns: string[]
): FileNode[] => {
  const allFiles = listAllFiles(node);

  const selectedFiles = allFiles.filter((file) => {
    let included = false;
    for (const pattern of globPatterns) {
      if (pattern.startsWith('!')) {
        if (minimatch(file.relativePath, pattern.slice(1), { dot: true })) {
          included = false;
        }
      } else {
        if (minimatch(file.relativePath, pattern, { dot: true })) {
          included = true;
        }
      }
    }
    return included;
  });

  return selectedFiles;
};

const listAllFiles = (node: DirectoryNode): FileNode[] => {
  return node.children.flatMap((child) =>
    child.type === 'file' ? [child] : listAllFiles(child)
  );
};

export const getTreePaths = (selectedFiles: FileNode[]): Set<string> => {
  const treePaths = new Set<string>();

  for (const file of selectedFiles) {
    treePaths.add(file.relativePath);

    const parts = file.relativePath.split('/');
    let current = '';
    for (let i = 0; i < parts.length - 1; i++) {
      current = current ? `${current}/${parts[i]}` : parts[i];
      treePaths.add(current);
    }
  }

  return treePaths;
};
