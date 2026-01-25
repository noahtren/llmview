import { FileNode, FileSystemNode, Renderer, RenderFilesOptions } from './types';
import { defaultRenderer, RENDER_RULES } from './renderers';

type RenderHierarchyOptions = {
  indentChar?: string;
  verbose?: boolean;
};

export const renderHierarchy = (
  node: FileSystemNode,
  options: RenderHierarchyOptions,
  visiblePaths?: Set<string>,
  currentDepth: number = 0
): string | null => {
  if (
    visiblePaths &&
    node.relativePath &&
    !visiblePaths.has(node.relativePath)
  ) {
    return null;
  }

  const { indentChar = '    ' } = options;
  const indent = indentChar.repeat(currentDepth);

  if (node.type === 'file') {
    return `${indent}${node.name}`;
  }

  let result = `${indent}${node.name}/`;

  if (node.children.length === 0) {
    return result;
  }
  const childrenOutput = node.children
    .map((child) =>
      renderHierarchy(child, options, visiblePaths, currentDepth + 1)
    )
    .filter((output) => output !== null)
    .join('\n');

  if (currentDepth === 0) {
    return `\`\`\`
<directory>
${result}
${childrenOutput}
</directory>
\`\`\`\n\n`;
  } else {
    return `${result}\n${childrenOutput}`;
  }
};

export const renderFiles = (
  rootPath: string,
  files: FileNode[],
  options: RenderFilesOptions
): string => {
  return files
    .map((file) => renderFileBlock(rootPath, file, options))
    .join('\n\n');
};

const renderFileBlock = (
  rootPath: string,
  file: FileNode,
  options: RenderFilesOptions
): string => {
  const renderer = getRenderer(file);
  const rendered = renderer(rootPath, file, options);

  if (options.verbose) {
    console.warn({ path: file.relativePath, length: rendered.length });
  }

  return `\`\`\`
<file path="${file.relativePath}">
${rendered}
</file>
\`\`\``;
};

const getRenderer = (
  file: FileNode,
): Renderer => {
  for (const { matcher, renderer } of RENDER_RULES) {
    if (matcher(file.name)) {
      return renderer;
    }
  }

  return defaultRenderer;
};
