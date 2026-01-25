#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { buildDirectory } from './build';
import { renderFiles, renderHierarchy } from './render';
import { selectFiles } from './select';

const parseLlmviewFile = (filePath: string): string[] => {
  const content = fs.readFileSync(filePath, 'utf-8');
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'));
};

const HELP_TEXT = `llmview - Generate LLM context from codebases using gitignore-style patterns

Usage: llmview [options] <view-file>

Arguments:
  <view-file>    Path to a .llmview file containing glob patterns

Options:
  -n, --number   Include line numbers in output
  -t, --tree     Include directory tree of selected files
  -v, --verbose  Print file statistics to stderr
  -h, --help     Show this help message
`;

const main = () => {
  const args = process.argv.slice(2);

  if (args.includes('-h') || args.includes('--help')) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  const verbose = args.includes('-v') || args.includes('--verbose');
  const includeTree = args.includes('-t') || args.includes('--tree');
  const lineNumbers = args.includes('-n') || args.includes('--number');
  const llmviewPath = args.find((arg) => !arg.startsWith('-'));

  if (!llmviewPath) {
    console.log(HELP_TEXT);
    process.exit(1);
  }

  const resolvedPath = path.resolve(llmviewPath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`File not found: ${resolvedPath}`);
    process.exit(1);
  }

  const patterns = parseLlmviewFile(resolvedPath);
  if (patterns.length === 0) {
    console.error('No patterns found in llmview file');
    process.exit(1);
  }

  const rootNode = buildDirectory(process.cwd());
  const { selectedFiles, visiblePaths } = selectFiles(rootNode, patterns, {
    verbose,
  });

  let output = '';

  if (includeTree) {
    output += renderHierarchy(rootNode, { verbose }, visiblePaths);
  }

  output += renderFiles(rootNode.rootPath, selectedFiles, {
    verbose,
    lineNumbers,
  });

  const estimatedTokens = Math.ceil(output.length / 4);
  if (verbose) {
    console.warn(`Estimated tokens: ${estimatedTokens}`);
  }

  console.log(output);
};

main();
