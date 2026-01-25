import { DirectoryNode, FileNode } from './types';
import { minimatch } from 'minimatch';

type SelectFilesOptions = {
  verbose?: boolean;
};

type SelectFilesResult = {
  selectedFiles: FileNode[];
  visiblePaths: Set<string>;
};

export const selectFiles = (
  node: DirectoryNode,
  globPatterns: string[],
  options: SelectFilesOptions
): SelectFilesResult => {
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
  const visiblePaths = getVisiblePaths(selectedFiles);

  if (options.verbose) {
    if (selectedFiles.length === 0) {
      console.warn(
        `No file(s) found that satisfy these patterns: ${globPatterns.join(
          ', '
        )}`
      );
    } else {
      console.warn(
        `${
          selectedFiles.length
        } file(s) found satisfying these patterns: ${globPatterns.join(', ')}`
      );
      console.warn({ visiblePaths });
    }
  }

  return { selectedFiles, visiblePaths };
};

const listAllFiles = (node: DirectoryNode): FileNode[] => {
  return node.children.flatMap((child) =>
    child.type === 'file' ? [child] : listAllFiles(child)
  );
};

export const getVisiblePaths = (selectedFiles: FileNode[]): Set<string> => {
  const visible = new Set<string>();

  for (const file of selectedFiles) {
    visible.add(file.relativePath);

    const parts = file.relativePath.split('/');
    let current = '';
    for (let i = 0; i < parts.length - 1; i++) {
      current = current ? `${current}/${parts[i]}` : parts[i];
      visible.add(current);
    }
  }

  return visible;
};
