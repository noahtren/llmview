#!/usr/bin/env node

import * as fs from 'fs/promises';
import * as path from 'path';
import { buildDirectory } from './build';
import { renderFiles, renderDirectory } from './render';
import { selectFiles } from './select';
import { CHARS_PER_TOKEN_ESTIMATE } from './constants';

const readStdin = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    process.stdin.on('data', (chunk) => chunks.push(chunk));
    process.stdin.on('end', () =>
      resolve(Buffer.concat(chunks).toString('utf-8'))
    );
    process.stdin.on('error', reject);
  });
};

const readPatterns = async (pathArg?: string): Promise<string[]> => {
  let content: string;

  if (!pathArg || pathArg === '-') {
    if (process.stdin.isTTY) {
      console.error('Error: No input file specified and stdin is a terminal');
      console.error('Usage: llmview <view-file> or pipe patterns via stdin');
      process.exit(1);
    }
    content = await readStdin();
  } else {
    const resolvedPath = path.resolve(pathArg);
    try {
      content = await fs.readFile(resolvedPath, 'utf-8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        console.error(`File not found: ${resolvedPath}`);
        process.exit(1);
      }
      throw err;
    }
  }

  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'));
};

const HELP_TEXT = `llmview - Generate LLM context from codebases using gitignore-style patterns

Usage: llmview [options] <view-file>

Arguments:
  <view-file>    Path to a .llmview file, or - to read patterns from stdin

Options:
  -l, --list     List selected files only (no content)
  -n, --number   Include line numbers in output
  -t, --tree     Include directory tree of selected files
  -v, --verbose  Print file statistics to stderr
  -h, --help     Show this help message
`;

const main = async () => {
  const args = process.argv.slice(2);

  if (args.includes('-h') || args.includes('--help')) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  const verbose = args.includes('-v') || args.includes('--verbose');
  const includeTree = args.includes('-t') || args.includes('--tree');
  const lineNumbers = args.includes('-n') || args.includes('--number');
  const listOnly = args.includes('-l') || args.includes('--list');

  const positionalArgs = args.filter((arg) => !arg.startsWith('-'));
  const patterns = await readPatterns(positionalArgs[0]);

  if (patterns.length === 0) {
    console.error('No patterns found in input');
    process.exit(1);
  }

  const rootNode = await buildDirectory(process.cwd());
  const { selectedFiles, visiblePaths } = selectFiles(rootNode, patterns, {
    verbose,
  });

  if (listOnly) {
    selectedFiles.forEach((file) => console.log(file.relativePath));
    process.exit(0);
  }

  let output = '';

  if (includeTree) {
    output += renderDirectory(rootNode, { verbose }, visiblePaths);
  }

  output += await renderFiles(rootNode.rootPath, selectedFiles, {
    verbose,
    lineNumbers,
  });

  const estimatedTokens = Math.ceil(output.length / CHARS_PER_TOKEN_ESTIMATE);
  if (verbose) {
    console.warn(`Estimated tokens: ${estimatedTokens}`);
  }

  console.log(output);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
