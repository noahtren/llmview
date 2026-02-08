import path from 'node:path';
import { FileNode, FormatOption } from './types';
import { LANG_MAP } from './constants';

const getLang = (filename: string): string => {
  const ext = path.extname(filename).toLowerCase();
  return LANG_MAP[ext] ?? ext.slice(1);
};

type Formatter = (
  renderedFiles: Array<{ file: FileNode; content: string }>,
  directory: string | null
) => string;

const formatters: Record<FormatOption, Formatter> = {
  xml: (renderedFiles, directory) => {
    const sections: string[] = [];
    if (directory) {
      sections.push(`<directory>\n${directory}\n</directory>`);
    }
    for (const { file, content } of renderedFiles) {
      sections.push(`<file path="${file.relativePath}">\n${content}\n</file>`);
    }
    return sections.join('\n');
  },

  json: (renderedFiles, directory) => {
    return JSON.stringify(
      {
        ...(directory != null && { directory }),
        files: renderedFiles.map(({ file, content }) => ({
          path: file.relativePath,
          size: file.size,
          content,
        })),
      },
      null,
      2
    );
  },

  markdown: (renderedFiles, directory) => {
    const parts: string[] = [];
    if (directory) {
      parts.push(`\`\`\`\n${directory}\n\`\`\``);
    }
    for (const { file, content } of renderedFiles) {
      const lang = getLang(file.name);
      parts.push(`\`${file.relativePath}\`\n\`\`\`${lang}\n${content}\n\`\`\``);
    }
    return parts.join('\n\n');
  },
};

export const formatOutput = (
  renderedFiles: Array<{ file: FileNode; content: string }>,
  directory: string | null,
  format: FormatOption
): string => formatters[format](renderedFiles, directory);
