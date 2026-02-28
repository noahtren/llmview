import { createReadStream } from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';
import * as readline from 'node:readline';

import { FileNode, RenderFileOptions, RenderRule } from './types';
import { CSV_PREVIEW_LINES, MAX_FILE_SIZE_KB } from './constants';

const readFirstNLines = async (
  filePath: string,
  n: number
): Promise<{ lines: string[]; hasMore: boolean }> => {
  const lines: string[] = [];
  const stream = createReadStream(filePath, { encoding: 'utf-8' });
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

export const defaultRule = async (
  projectPath: string,
  file: FileNode,
  options: RenderFileOptions
): Promise<string> => {
  const fullPath = path.join(projectPath, file.relativePath);

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

// Render rules are checked in order.
// Specialized renderers will catch files first, falling back to the default renderer.
export const RENDER_RULES: RenderRule[] = [
  // Binary guard
  async (projectPath, file) => {
    const fullPath = path.join(projectPath, file.relativePath);
    const fd = await fsPromises.open(fullPath, 'r');
    try {
      const buf = Buffer.alloc(8192);
      const { bytesRead } = await fd.read(buf, 0, 8192, 0);
      if (bytesRead > 0 && buf.subarray(0, bytesRead).includes(0)) {
        return '(Contents excluded: binary file)';
      }
    } finally {
      await fd.close();
    }
    return null;
  },

  // CSV preview
  async (projectPath, file, options) => {
    if (!file.relativePath.toLowerCase().endsWith('.csv')) return null;
    const fullPath = path.join(projectPath, file.relativePath);
    const { lines, hasMore } = await readFirstNLines(
      fullPath,
      CSV_PREVIEW_LINES
    );
    const preview = options.lineNumbers ? numberLines(lines) : lines.join('\n');
    return hasMore ? `${preview}\n... (more rows)` : preview;
  },
];
