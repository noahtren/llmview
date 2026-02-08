import * as fs from 'fs/promises';
import * as path from 'path';
import { parseArgs } from 'node:util';
import { text } from 'node:stream/consumers';
import { scanDirectory } from './scan';
import { renderFiles, renderDirectory } from './render';
import { getTreePaths, selectFiles } from './select';
import { formatOutput } from './format';
import { FormatOption } from './types';

declare const __VERSION__: string;

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
    .map((line) => line.replace(/#.*$/, '').trim())
    .filter((line) => line !== '');
};

const HELP_TEXT = `llmview - Reusable views of code for LLM context

Usage: llmview [options] <view-file>

Arguments:
  <view-file>    Path to a .llmview file, or - to read patterns from stdin

Options:
  -j, --json        Output as JSON instead of XML tags
  -m, --markdown    Output as markdown instead of XML tags
  -l, --list        List selected files only (no content)
  -n, --number      Include line numbers in output
  -t, --tree        Include directory tree of selected files
  -v, --verbose     Print file statistics to stderr
  -h, --help        Show this help message
  -V, --version     Show version number
`;

const main = async () => {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      json: { type: 'boolean', short: 'j', default: false },
      markdown: { type: 'boolean', short: 'm', default: false },
      list: { type: 'boolean', short: 'l', default: false },
      number: { type: 'boolean', short: 'n', default: false },
      tree: { type: 'boolean', short: 't', default: false },
      verbose: { type: 'boolean', short: 'v', default: false },
      help: { type: 'boolean', short: 'h', default: false },
      version: { type: 'boolean', short: 'V', default: false },
    },
    allowPositionals: true,
  });

  const formatFlags = [values.json, values.markdown].filter(Boolean);
  if (formatFlags.length > 1) {
    console.error('Only one format flag can be used (--json, --markdown)');
    process.exit(1);
  }

  if (values.help) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  if (values.version) {
    console.log(__VERSION__);
    process.exit(0);
  }

  const patterns = await readPatterns(positionals[0]);

  if (patterns.length === 0) {
    console.error('No patterns found in input');
    process.exit(1);
  }

  const projectPath = process.cwd();
  const rootNode = await scanDirectory(projectPath);
  const selectedFiles = selectFiles(rootNode, patterns);

  if (values.list) {
    selectedFiles.forEach((file) => console.log(file.relativePath));
    process.exit(0);
  }

  let directory = null;

  if (values.tree) {
    const treePaths = getTreePaths(selectedFiles);
    directory = renderDirectory(rootNode, treePaths);
  }
  const renderedFiles = await renderFiles(projectPath, selectedFiles, {
    lineNumbers: values.number,
  });

  const format: FormatOption = values.markdown
    ? 'markdown'
    : values.json
      ? 'json'
      : 'xml';

  const output = formatOutput(renderedFiles, directory, format);

  if (values.verbose) {
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
