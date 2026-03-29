import { Ignore } from 'ignore';
import { Frontmatter } from './frontmatter';

export type FileNode = {
  relativePath: string;
  type: 'file';
  size: number;
};

export type DirectoryNode = {
  relativePath: string;
  type: 'directory';
  children: FileSystemNode[];
};

export type FileSystemNode = FileNode | DirectoryNode;

export type ScopedIgnore = {
  ig: Ignore;
  scope: string;
};

export type RenderFileOptions = {
  lineNumbers?: boolean;
  frontmatterOnly?: boolean;
};

export type RenderResult = {
  content: string;
  frontmatter?: Frontmatter | null;
};

export type RenderRule = (
  projectPath: string,
  file: FileNode,
  options: RenderFileOptions
) => Promise<RenderResult | string | null>;

export const FORMAT_OPTIONS = ['xml', 'json', 'markdown'] as const;
export type FormatOption = (typeof FORMAT_OPTIONS)[number];

export type LlmviewOptions = {
  globs: string[];
  format?: FormatOption;
  number?: boolean;
  tree?: boolean;
  treeOnly?: boolean;
  list?: boolean;
  verbose?: boolean;
  frontmatterOnly?: boolean;
};

export type RenderedFile = {
  file: FileNode;
  content: string;
  frontmatter?: Frontmatter | null;
};

export type ExecuteResult = {
  output: string;
  selectedFiles: FileNode[];
  renderedFiles: RenderedFile[] | null;
};

export type FileCharCount = {
  path: string;
  chars: number;
};

export type FormatResult = {
  output: string;
  fileChars: FileCharCount[] | null;
};
