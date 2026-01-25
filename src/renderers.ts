import * as fs from 'fs';
import * as path from 'path';
import { FileNode, Renderer, RenderFilesOptions } from './types';
import { MAX_FILE_SIZE_KB } from './constants';

const readFirstNLines = (
  filePath: string,
  n: number
): { lines: string[]; hasMore: boolean } => {
  const fd = fs.openSync(filePath, 'r');
  const bufferSize = 64 * 1024;
  const buffer = Buffer.alloc(bufferSize);

  const lines: string[] = [];
  let leftover = '';
  let hasMore = false;

  try {
    while (lines.length < n) {
      const bytesRead = fs.readSync(fd, buffer, 0, bufferSize, null);
      if (bytesRead === 0) break; // EOF

      const chunk = leftover + buffer.toString('utf-8', 0, bytesRead);
      const chunkLines = chunk.split('\n');
      leftover = chunkLines.pop() || '';

      for (const line of chunkLines) {
        if (lines.length < n) {
          lines.push(line);
        } else {
          hasMore = true;
          break;
        }
      }

      if (hasMore) break;
    }

    if (!hasMore && lines.length >= n) {
      if (leftover !== '') {
        hasMore = true;
      } else {
        hasMore = fs.readSync(fd, buffer, 0, 1, null) > 0;
      }
    }

    return { lines, hasMore };
  } finally {
    fs.closeSync(fd);
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

export const defaultRenderer = (
  rootPath: string,
  file: FileNode,
  options: RenderFilesOptions
): string => {
  const fullPath = path.join(rootPath, file.relativePath);

  const stats = fs.statSync(fullPath);
  if (stats.size > MAX_FILE_SIZE_KB * 1024) {
    return `(File contents excluded: size ${(stats.size / 1024).toFixed(
      2
    )}KB exceeds ${MAX_FILE_SIZE_KB}KB limit)`;
  }

  const content = fs.readFileSync(fullPath, 'utf-8');

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
    renderer: (rootPath, file, options) => {
      const fullPath = path.join(rootPath, file.relativePath);
      const { lines, hasMore } = readFirstNLines(fullPath, 10);
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
    renderer: (rootPath, file, options) => '(Contents excluded)',
  },
  // media
  {
    matcher: (name) =>
      ['.ico', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp4'].some((ext) =>
        name.toLowerCase().endsWith(ext)
      ),
    renderer: (rootPath, file, options) => '(Contents excluded)',
  },
  // misc
  {
    matcher: (name) =>
      ['.pdf', '.zip'].some((ext) => name.toLowerCase().endsWith(ext)),
    renderer: (rootPath, file, options) => '(Contents excluded)',
  },
];
