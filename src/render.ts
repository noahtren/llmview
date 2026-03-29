import * as path from 'node:path';

import pLimit from 'p-limit';
import {
  FileNode,
  FileSystemNode,
  RenderFileOptions,
  RenderResult,
  RenderedFile,
} from './types';
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
): Promise<RenderedFile[]> => {
  const limit = pLimit(MAX_OPEN_FILES);

  return Promise.all(
    files.map((file) =>
      limit(async () => {
        const result = await renderFile(projectPath, file, options);

        if (typeof result === 'string') {
          return { file, content: result };
        }

        return { file, ...result };
      })
    )
  );
};

const renderFile = async (
  projectPath: string,
  file: FileNode,
  options: RenderFileOptions
): Promise<RenderResult | string> => {
  for (const rule of RENDER_RULES) {
    const result = await rule(projectPath, file, options);
    if (result !== null) return result;
  }
  return defaultRule(projectPath, file, options);
};
