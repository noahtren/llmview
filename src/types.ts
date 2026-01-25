import { Ignore } from 'ignore';

type FileSystemNodeBase = {
  ino: number;
  name: string;
  relativePath: string;
  createdAt: Date;
  updatedAt: Date;
};

export type FileNode = FileSystemNodeBase & {
  type: 'file';
  children?: never;
};

export type DirectoryNode = FileSystemNodeBase & {
  type: 'directory';
  children: FileSystemNode[];
};

export type RootDirectoryNode = DirectoryNode & {
  rootPath: string;
};

export type FileSystemNode = FileNode | DirectoryNode;

export type ScopedIgnore = {
  ig: Ignore;
  scope: string;
};

export type RenderFilesOptions = {
  lineNumbers?: boolean;
  verbose?: boolean;
};

export type Renderer = (
  rootPath: string,
  file: FileNode,
  options: RenderFilesOptions
) => string;