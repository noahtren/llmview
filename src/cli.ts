import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { parseArgs } from 'node:util';
import { text } from 'node:stream/consumers';

import { execute } from './execute';
import { isDoc, resolve } from './docs';
import { FORMAT_OPTIONS, FormatOption } from './types';
import { style } from './util';

declare const __VERSION__: string;

const helpText = () => {
  const h = (text: string) => style(['green', 'bold'], text);
  const c = (text: string) => style(['cyan', 'bold'], text);
  const d = (text: string) => style('cyan', text);

  return `Reusable views of code for LLM context

${h('Usage:')} ${c('llmview')} ${d('[OPTIONS]')} ${d('<VIEW-FILE>')}

${h('Arguments:')}
  ${d('<VIEW-FILE>')}    Path to a .mdx or .llmview file, or - for stdin

${h('Options:')}
  ${c('-f, --format')} ${d('<FMT>')}      Output format: xml (default), json, markdown
  ${c('-l, --list')}              List selected files only
  ${c('-n, --number')}            Include line numbers in rendered files
  ${c('-t, --tree')}              Include directory tree of selected files
  ${c('-T, --tree-only')}         Show only the directory tree (no file contents)
  ${c('-F, --frontmatter-only')}  Show only parsed YAML frontmatter (no file body)
  ${c('-v, --verbose')}           Print file statistics to stderr
  ${c('-h, --help')}              Show this help message
  ${c('-V, --version')}           Show version number
`;
};

const readContent = async (pathArg?: string): Promise<string> => {
  if (!pathArg || pathArg === '-') {
    if (process.stdin.isTTY) {
      console.log(helpText());
      process.exit(1);
    }
    return await text(process.stdin);
  }

  const resolvedPath = path.resolve(pathArg);
  try {
    return await fs.readFile(resolvedPath, 'utf-8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      console.error(`File not found: ${resolvedPath}`);
      process.exit(1);
    }
    throw err;
  }
};

const parsePatterns = (content: string): string[] =>
  content
    .split('\n')
    .map((line) => line.replace(/#.*$/, '').trim())
    .filter((line) => line !== '');

const main = async () => {
  const scriptIndex = process.argv.findIndex(
    (a) => a.endsWith('cli.ts') || a.endsWith('cli.js')
  );
  const args = process.argv.slice(scriptIndex === -1 ? 2 : scriptIndex + 1);
  const { values, positionals } = parseArgs({
    args: args,
    options: {
      format: { type: 'string', short: 'f', default: 'xml' },
      list: { type: 'boolean', short: 'l', default: false },
      number: { type: 'boolean', short: 'n', default: false },
      tree: { type: 'boolean', short: 't', default: false },
      'tree-only': { type: 'boolean', short: 'T', default: false },
      'frontmatter-only': { type: 'boolean', short: 'F', default: false },
      verbose: { type: 'boolean', short: 'v', default: false },
      help: { type: 'boolean', short: 'h', default: false },
      version: { type: 'boolean', short: 'V', default: false },
    },
    allowPositionals: true,
  });

  if (!FORMAT_OPTIONS.includes(values.format as FormatOption)) {
    console.error(
      `Invalid format: ${values.format}. Must be one of: ${FORMAT_OPTIONS.join(', ')}`
    );
    process.exit(1);
  }

  if (values.help) {
    console.log(helpText());
    process.exit(0);
  }

  if (values.version) {
    console.log(__VERSION__);
    process.exit(0);
  }

  const content = await readContent(positionals[0]);

  if (isDoc(content)) {
    const output = await resolve(content, process.cwd(), {
      format: values.format as FormatOption,
      number: values.number,
      tree: values.tree || values['tree-only'],
      treeOnly: values['tree-only'],
      list: values.list,
      verbose: values.verbose,
      frontmatterOnly: values['frontmatter-only'],
    });
    console.log(output);
    return;
  }

  const patterns = parsePatterns(content);

  if (patterns.length === 0) {
    console.error('No patterns found in input');
    process.exit(1);
  }

  const { output } = await execute(process.cwd(), {
    globs: patterns,
    format: values.format as FormatOption,
    number: values.number,
    tree: values.tree || values['tree-only'],
    treeOnly: values['tree-only'],
    list: values.list,
    verbose: values.verbose,
    frontmatterOnly: values['frontmatter-only'],
  });

  console.log(output);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
