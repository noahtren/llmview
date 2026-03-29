import * as path from 'node:path';

import {
  FileCharCount,
  FormatOption,
  FormatResult,
  RenderedFile,
} from './types';
import { Frontmatter } from './frontmatter';
import { LANG_MAP } from './constants';

const getLang = (filePath: string): string => {
  const ext = path.extname(filePath).toLowerCase();
  return LANG_MAP[ext] ?? ext.slice(1);
};

const renderXmlFrontmatter = (fm: Frontmatter): string => {
  const lines = Object.entries(fm).map(
    ([key, value]) => `  <${key}>${String(value ?? '')}</${key}>`
  );
  return `<frontmatter>\n${lines.join('\n')}\n</frontmatter>`;
};

const renderMarkdownFrontmatter = (fm: Frontmatter): string => {
  return Object.entries(fm)
    .map(([key, value]) => `${key}: ${String(value ?? '')}`)
    .join('\n');
};

type Formatter = (
  renderedFiles: RenderedFile[] | null,
  directory: string | null
) => FormatResult;

const formatters: Record<FormatOption, Formatter> = {
  xml: (renderedFiles, directory) => {
    const sections: string[] = [];
    const fileChars: FileCharCount[] = [];

    if (directory) {
      sections.push(`<directory>\n${directory}\n</directory>`);
    }
    if (renderedFiles) {
      for (const { file, content, frontmatter } of renderedFiles) {
        const parts: string[] = [];
        if (frontmatter) parts.push(renderXmlFrontmatter(frontmatter));
        if (content) parts.push(content);
        const inner = parts.join('\n');
        const section = inner
          ? `<file path="${file.relativePath}">\n${inner}\n</file>`
          : `<file path="${file.relativePath}" />`;
        fileChars.push({ path: file.relativePath, chars: section.length });
        sections.push(section);
      }
    }
    return {
      output: sections.join('\n'),
      fileChars: fileChars.length > 0 ? fileChars : null,
    };
  },

  json: (renderedFiles, directory) => {
    const fileEntries = renderedFiles?.map(
      ({ file, content, frontmatter }) => ({
        path: file.relativePath,
        ...(frontmatter != null && { frontmatter }),
        ...(content && { content }),
      })
    );

    const output = JSON.stringify(
      {
        ...(directory != null && { directory }),
        ...(fileEntries != null && { files: fileEntries }),
      },
      null,
      2
    );

    // Per-file: stringify each entry individually for an approximate breakdown
    const fileChars =
      fileEntries?.map((entry) => ({
        path: entry.path,
        chars: JSON.stringify(entry, null, 2).length,
      })) ?? null;

    return { output, fileChars };
  },

  markdown: (renderedFiles, directory) => {
    const parts: string[] = [];
    const fileChars: FileCharCount[] = [];

    if (directory) {
      parts.push(`\`\`\`\n${directory}\n\`\`\``);
    }
    if (renderedFiles) {
      for (const { file, content, frontmatter } of renderedFiles) {
        const fileParts: string[] = [`\`${file.relativePath}\``];
        if (frontmatter) fileParts.push(renderMarkdownFrontmatter(frontmatter));
        if (content) {
          const lang = getLang(file.relativePath);
          fileParts.push(`\`\`\`${lang}\n${content}\n\`\`\``);
        }
        const section = fileParts.join('\n');
        fileChars.push({ path: file.relativePath, chars: section.length });
        parts.push(section);
      }
    }
    return {
      output: parts.join('\n\n'),
      fileChars: fileChars.length > 0 ? fileChars : null,
    };
  },
};

export const formatOutput = (
  renderedFiles: RenderedFile[] | null,
  directory: string | null,
  format: FormatOption
): FormatResult => formatters[format](renderedFiles, directory);
