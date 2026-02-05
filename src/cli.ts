import * as fs from 'fs/promises';
import * as path from 'path';
import { text } from 'node:stream/consumers';
import { buildDirectory } from './build';
import { renderFiles, renderDirectory } from './render';
import { getTreePaths, selectFiles } from './select';

const readStdin = (): Promise<string> => text(process.stdin);

const readPatterns = async (pathArg?: string): Promise<string[]> => {
  let content: string;

  if (!pathArg || pathArg === '-') {
    if (process.stdin.isTTY) {
      console.log(HELP_TEXT);
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

const HELP_TEXT = `llmview - Generate LLM context from codebases

Usage: llmview [options] <view-file>

Arguments:
  <view-file>    Path to a .llmview file, or - to read patterns from stdin

Options:
  -j, --json     Output as JSON instead of XML tags
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
  const asJson = args.includes('-j') || args.includes('--json');

  const positionalArgs = args.filter((arg) => !arg.startsWith('-'));
  const patterns = await readPatterns(positionalArgs[0]);

  if (patterns.length === 0) {
    console.error('No patterns found in input');
    process.exit(1);
  }

  const projectPath = process.cwd();
  const rootNode = await buildDirectory(projectPath);
  const selectedFiles = selectFiles(rootNode, patterns);

  if (listOnly) {
    selectedFiles.forEach((file) => console.log(file.relativePath));
    process.exit(0);
  }

  let directory = null;

  if (includeTree) {
    const treePaths = getTreePaths(selectedFiles);
    directory = renderDirectory(rootNode, treePaths);
  }
  const renderedFiles = await renderFiles(projectPath, selectedFiles, {
    lineNumbers,
  });
  let output = '';
  if (asJson) {
    const result = {
      directory: directory,
      files: renderedFiles.map(({ file, content }) => ({
        path: file.relativePath,
        size: file.size,
        content,
      })),
    };
    output = JSON.stringify(result, null, 2);
  } else {
    if (directory) {
      output += `\n<directory>\n${directory}\n</directory>\n`;
    }
    output += renderedFiles
      .map(
        ({ file, content }) =>
          `<file path="${file.relativePath}">
${content}
</file>`
      )
      .join('\n');
    output = `\`\`\`\n${output}\n\`\`\``;
  }

  if (verbose) {
    const patternList = patterns.join(', ');

    if (selectedFiles.length === 0) {
      console.warn(`0 files matched (${patternList})`);
    } else {
      console.warn(`${selectedFiles.length} files matched (${patternList})`);
      console.warn(`Total characters: ${output.length}`);
      console.warn('');
      console.warn('Files by size:');

      const largestFiles = [...renderedFiles].sort(
        (a, b) => b.content.length - a.content.length
      );
      const maxPathLen = Math.max(
        ...largestFiles.map((f) => f.file.relativePath.length)
      );

      for (const { file, content } of largestFiles) {
        const paddedPath = file.relativePath.padEnd(maxPathLen);
        const chars = content.length.toLocaleString().padStart(8);
        console.warn(`  ${paddedPath}  ${chars} chars`);
      }
    }
  }

  console.log(output);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
