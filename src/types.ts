import { Ignore } from 'ignore';

export type FileNode = {
  name: string;
  relativePath: string;
  type: 'file';
  size: number;
};

export type DirectoryNode = {
  name: string;
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

export type Renderer = (
  rootPath: string,
  file: FileNode,
  options: RenderFileOptions
) => Promise<string>;

export type FormatOption = 'xml' | 'json' | 'markdown';
