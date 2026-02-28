import { Ignore } from 'ignore';

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
};

export type RenderRule = (
  projectPath: string,
  file: FileNode,
  options: RenderFileOptions
) => Promise<string | null>;

export type FormatOption = 'xml' | 'json' | 'markdown';
