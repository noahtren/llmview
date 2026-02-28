import { DirectoryNode, FileNode } from './types';
import { Minimatch } from 'minimatch';

// Recursively flatten DirectoryNode to get its FileNodes
const listAllFiles = (node: DirectoryNode): FileNode[] => {
  return node.children.flatMap((child) =>
    child.type === 'file' ? [child] : listAllFiles(child)
  );
};

// Filter files by minimatch patterns
export const selectFiles = (
  node: DirectoryNode,
  globPatterns: string[]
): FileNode[] => {
  const allFiles = listAllFiles(node);

  const matchers = globPatterns.map((pattern) => {
    const isNegation = pattern.startsWith('!');
    const raw = isNegation ? pattern.slice(1) : pattern;
    return { isNegation, matcher: new Minimatch(raw, { dot: true }) };
  });

  return allFiles.filter((file) => {
    let included = false;
    for (const { isNegation, matcher } of matchers) {
      if (matcher.match(file.relativePath)) {
        included = !isNegation;
      }
    }
    return included;
  });
};

// Get required parent directories for selected files
export const getTreePaths = (selectedFiles: FileNode[]): Set<string> => {
  const treePaths = new Set<string>();

  for (const file of selectedFiles) {
    treePaths.add(file.relativePath);

    const parts = file.relativePath.split('/');
    let current = '';
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      treePaths.add(current);
    }
  }

  return treePaths;
};
