import { DirectoryNode, FileNode } from './types';
import { Minimatch } from 'minimatch';

export const selectFiles = (
  node: DirectoryNode,
  globPatterns: string[]
): FileNode[] => {
  const allFiles = listAllFiles(node);

  const compiled = globPatterns.map((pattern) => {
    const isNegation = pattern.startsWith('!');
    const raw = isNegation ? pattern.slice(1) : pattern;
    return { isNegation, mm: new Minimatch(raw, { dot: true }) };
  });

  return allFiles.filter((file) => {
    let included = false;
    for (const { isNegation, mm } of compiled) {
      if (mm.match(file.relativePath)) {
        included = !isNegation;
      }
    }
    return included;
  });
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
