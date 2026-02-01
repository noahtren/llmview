import {
  FileNode,
  FileSystemNode,
  Renderer,
  RenderFilesOptions,
} from './types';
import { defaultRenderer, RENDER_RULES } from './render-rules';

type RenderHierarchyOptions = {
  indentChar?: string;
  verbose?: boolean;
};

export const renderDirectory = (
  rootNode: FileSystemNode,
  options: RenderHierarchyOptions,
  visiblePaths?: Set<string>
): string => {
  return renderDirectoryNode(rootNode, options, visiblePaths, 0);
};

const renderDirectoryNode = (
  node: FileSystemNode,
  options: RenderHierarchyOptions,
  visiblePaths: Set<string> | undefined,
  currentDepth: number
): string => {
  const { indentChar = '    ' } = options;
  const indent = indentChar.repeat(currentDepth);

  if (node.type === 'file') {
    return `${indent}${node.name}`;
  }

  const childrenOutput = node.children
    .filter(
      (child) =>
        !visiblePaths ||
        !child.relativePath ||
        visiblePaths.has(child.relativePath)
    )
    .map((child) =>
      renderDirectoryNode(child, options, visiblePaths, currentDepth + 1)
    )
    .join('\n');

  const result = `${indent}${node.name}/`;

  if (currentDepth === 0) {
    return `\`\`\`\n<directory>\n${result}\n${childrenOutput}\n</directory>\n\`\`\`\n\n`;
  }

  return childrenOutput ? `${result}\n${childrenOutput}` : result;
};

export const renderFiles = async (
  rootPath: string,
  files: FileNode[],
  options: RenderFilesOptions
): Promise<string> => {
  const renderedBlocks = await Promise.all(
    files.map((file) => renderFile(rootPath, file, options))
  );
  return renderedBlocks.join('\n\n');
};

const renderFile = async (
  rootPath: string,
  file: FileNode,
  options: RenderFilesOptions
): Promise<string> => {
  const renderer = getRenderer(file);
  const rendered = await renderer(rootPath, file, options);

  if (options.verbose) {
    console.warn({ path: file.relativePath, length: rendered.length });
  }

  return `\`\`\`
<file path="${file.relativePath}">
${rendered}
</file>
\`\`\``;
};

const getRenderer = (file: FileNode): Renderer => {
  for (const { matcher, renderer } of RENDER_RULES) {
    if (matcher(file.name)) {
      return renderer;
    }
  }

  return defaultRenderer;
};
