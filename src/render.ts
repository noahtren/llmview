import pLimit from 'p-limit';
import { FileNode, FileSystemNode, Renderer, RenderFileOptions } from './types';
import { defaultRenderer, RENDER_RULES } from './render-rules';
import { INDENT_CHAR, MAX_OPEN_FILES } from './constants';

export const renderDirectory = (
  rootNode: FileSystemNode,
  treePaths: Set<string>
): string => {
  return renderDirectoryNode(rootNode, treePaths, 0);
};

const renderDirectoryNode = (
  node: FileSystemNode,
  treePaths: Set<string>,
  currentDepth: number
): string => {
  const indent = INDENT_CHAR.repeat(currentDepth);

  if (node.type === 'file') {
    return `${indent}${node.name}`;
  }

  const childrenOutput = node.children
    .filter(
      (child) => child.relativePath === '' || treePaths.has(child.relativePath)
    )
    .map((child) => renderDirectoryNode(child, treePaths, currentDepth + 1))
    .join('\n');

  const result = `${indent}${node.name}/`;

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
  const renderer = getRenderer(file);
  const rendered = await renderer(projectPath, file, options);

  return rendered;
};

const getRenderer = (file: FileNode): Renderer => {
  for (const { matcher, renderer } of RENDER_RULES) {
    if (matcher(file.name)) {
      return renderer;
    }
  }

  return defaultRenderer;
};
