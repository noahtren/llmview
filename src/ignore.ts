import * as fs from 'fs/promises';
import ignore, { Ignore } from 'ignore';
import { ScopedIgnore } from './types';

export const createIgnoreFromFile = async (
  gitignorePath: string
): Promise<Ignore | undefined> => {
  try {
    const content = await fs.readFile(gitignorePath, 'utf8');
    return ignore().add(content);
  } catch {
    return undefined;
  }
};

export const createIgnore = (content: string): Ignore => {
  return ignore().add(content);
};

export const isPathIgnored = (
  relativePath: string,
  isDirectory: boolean,
  ignores: ScopedIgnore[]
): boolean => {
  const pathToCheck = isDirectory ? `${relativePath}/` : relativePath;
  let ignored = false;

  for (const { ig, scope } of ignores) {
    const localPath =
      scope === ''
        ? pathToCheck
        : pathToCheck.startsWith(scope + '/')
          ? pathToCheck.slice(scope.length + 1)
          : null;

    if (localPath === null) continue;

    const result = ig.test(localPath);
    if (result.ignored) {
      ignored = true;
    } else if (result.unignored) {
      ignored = false;
    }
  }
  return ignored;
};
