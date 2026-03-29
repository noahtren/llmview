import * as path from 'node:path';

import { scanDirectory } from './scan';
import { getTreePaths, selectFiles } from './select';
import { renderFiles, renderTree } from './render';
import { formatOutput } from './format';
import {
  DirectoryNode,
  ExecuteResult,
  FileCharCount,
  LlmviewOptions,
  RenderedFile,
} from './types';
import { style } from './util';

type RenderMode = 'tree-only' | 'frontmatter-only' | 'tree-and-files' | 'files';

const getRenderMode = (
  tree: boolean,
  treeOnly: boolean,
  frontMatterOnly: boolean
): RenderMode => {
  if (treeOnly) return 'tree-only';
  if (frontMatterOnly) return 'frontmatter-only';
  if (tree) return 'tree-and-files';
  return 'files';
};

const renderModeLabel: Record<RenderMode, string> = {
  'tree-only': '(tree only)',
  'frontmatter-only': '(frontmatter only)',
  'tree-and-files': 'tree + file contents',
  files: '',
};

const log = (message: string) => console.warn(message);

const formatPatternList = (globs: string[]): string => {
  const inner = globs.map((g) => `'${style('cyanBright', g)}'`).join(', ');
  return `[${inner}]`;
};

const logMatchSection = (count: number, globs: string[], mode: RenderMode) => {
  log(
    `${style(['green', 'bold'], `${count} file${count === 1 ? '' : 's'} matching`)} ${formatPatternList(globs)} ${style(['green', 'bold'], renderModeLabel[mode])}`
  );
};

const logFileChars = (fileChars: FileCharCount[]) => {
  const sorted = [...fileChars].sort((a, b) => b.chars - a.chars);
  const maxPathLen = Math.max(...sorted.map((f) => f.path.length));

  for (const { path, chars } of sorted) {
    const paddedPath = path.padEnd(maxPathLen);
    const charStr = chars.toLocaleString().padStart(8);
    log(`  ${paddedPath}  ${style('bold', charStr)} chars`);
  }
};

export const execute = async (
  projectPath: string,
  options: LlmviewOptions,
  root?: DirectoryNode
): Promise<ExecuteResult> => {
  const {
    globs,
    format = 'xml',
    number: lineNumbers,
    tree,
    treeOnly,
    list,
    verbose,
    frontmatterOnly,
  } = options;

  if (!root) {
    root = await scanDirectory(projectPath);
  }

  const selectedFiles = selectFiles(root, globs);

  if (list) {
    const output = selectedFiles.map((f) => f.relativePath).join('\n');
    return { output, selectedFiles, renderedFiles: null };
  }

  const renderMode = getRenderMode(
    tree ?? false,
    treeOnly ?? false,
    frontmatterOnly ?? false
  );

  let directory: string | null = null;
  if (renderMode === 'tree-only' || renderMode === 'tree-and-files') {
    const treePaths = getTreePaths(selectedFiles);
    directory = renderTree(root, treePaths, path.basename(projectPath));
  }

  let renderedFiles: RenderedFile[] | null = null;
  if (renderMode !== 'tree-only') {
    renderedFiles = await renderFiles(projectPath, selectedFiles, {
      lineNumbers,
      frontmatterOnly,
    });
  }

  const { output, fileChars } = formatOutput(renderedFiles, directory, format);

  if (verbose) {
    logMatchSection(selectedFiles.length, globs, renderMode);
    if (fileChars) {
      logFileChars(fileChars);
    }
    log(`${style('bold', output.length.toLocaleString())} total chars`);
    log('');
  }

  return { output, selectedFiles, renderedFiles };
};
