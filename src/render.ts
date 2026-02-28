import * as path from 'node:path';

import pLimit from 'p-limit';
import { FileNode, FileSystemNode, RenderFileOptions } from './types';
import { defaultRule, RENDER_RULES } from './render-rules';
import { INDENT_CHAR, MAX_OPEN_FILES } from './constants';

export const renderTree = (
  node: FileSystemNode,
  treePaths: Set<string>,
  rootName: string,
  currentDepth: number = 0
): string => {
  const indent = INDENT_CHAR.repeat(currentDepth);
  const name = node.relativePath ? path.basename(node.relativePath) : rootName;

  if (node.type === 'file') {
    return `${indent}${name}`;
  }

  const childrenOutput = node.children
    .filter(
      (child) => child.relativePath === '' || treePaths.has(child.relativePath)
    )
    .map((child) => renderTree(child, treePaths, rootName, currentDepth + 1))
    .join('\n');

  const result = `${indent}${name}/`;

  return childrenOutput ? `${result}\n${childrenOutput}` : result;
};

export const renderFiles = async (
  projectPath: string,
  files: FileNode[],
  options: RenderFileOptions
): Promise<Array<{ file: FileNode; content: string }>> => {
  const limit = pLimit(MAX_OPEN_FILES);

  const renderedFiles = await Promise.all(
    files.map((file) =>
      limit(async () => {
        const content = await renderFile(projectPath, file, options);
        return { file, content };
      })
    )
  );

  return renderedFiles;
};

const renderFile = async (
  projectPath: string,
  file: FileNode,
  options: RenderFileOptions
): Promise<string> => {
  for (const rule of RENDER_RULES) {
    const result = await rule(projectPath, file, options);
    if (result !== null) return result;
  }
  return defaultRule(projectPath, file, options);
};
