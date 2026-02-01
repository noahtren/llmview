import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import * as readline from 'readline';
import { FileNode, Renderer, RenderFilesOptions } from './types';
import { CSV_PREVIEW_LINES, MAX_FILE_SIZE_KB } from './constants';

const readFirstNLines = async (
  filePath: string,
  n: number
): Promise<{ lines: string[]; hasMore: boolean }> => {
  const lines: string[] = [];
  const stream = fs.createReadStream(filePath, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  try {
    for await (const line of rl) {
      if (lines.length < n) {
        lines.push(line);
      } else {
        return { lines, hasMore: true };
      }
    }
    return { lines, hasMore: false };
  } finally {
    rl.close();
    stream.destroy();
  }
};

const numberLines = (lines: string[]): string => {
  return lines
    .map((line, index) => {
      const lineNumber = (index + 1).toString().padStart(6, ' ');
      return `${lineNumber}\t${line}`;
    })
    .join('\n');
};

export const defaultRenderer: Renderer = async (
  rootPath: string,
  file: FileNode,
  options: RenderFilesOptions
): Promise<string> => {
  const fullPath = path.join(rootPath, file.relativePath);

  if (file.size > MAX_FILE_SIZE_KB * 1024) {
    return `(File contents excluded: size ${(file.size / 1024).toFixed(
      2
    )}KB exceeds ${MAX_FILE_SIZE_KB}KB limit)`;
  }

  const content = await fsPromises.readFile(fullPath, 'utf-8');

  if (options.lineNumbers) {
    const lines = content.split('\n');
    return numberLines(lines);
  }
  return content;
};

export const RENDER_RULES: Array<{
  matcher: (filename: string) => boolean;
  renderer: Renderer;
}> = [
  // csv
  {
    matcher: (name) => ['.csv'].some((ext) => name.toLowerCase().endsWith(ext)),
    renderer: async (rootPath, file, options) => {
      const fullPath = path.join(rootPath, file.relativePath);
      const { lines, hasMore } = await readFirstNLines(
        fullPath,
        CSV_PREVIEW_LINES
      );
      const preview = options.lineNumbers
        ? numberLines(lines)
        : lines.join('\n');
      return hasMore ? `${preview}\n... (more rows)` : preview;
    },
  },
  // excel
  {
    matcher: (name) =>
      ['.xls', '.xlsx'].some((ext) => name.toLowerCase().endsWith(ext)),
    renderer: async () => '(Contents excluded)',
  },
  // media
  {
    matcher: (name) =>
      ['.ico', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp4'].some((ext) =>
        name.toLowerCase().endsWith(ext)
      ),
    renderer: async () => '(Contents excluded)',
  },
  // misc
  {
    matcher: (name) =>
      ['.pdf', '.zip'].some((ext) => name.toLowerCase().endsWith(ext)),
    renderer: async () => '(Contents excluded)',
  },
];
