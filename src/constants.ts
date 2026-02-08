export const BASE_IGNORE_CONTENT = `.git
.DS_Store
__pycache__/
node_modules/`;

export const MAX_FILE_SIZE_KB = 250;
export const CSV_PREVIEW_LINES = 10;
export const INDENT_CHAR = '    ';
export const MAX_OPEN_FILES = 64;

export const LANG_MAP: Record<string, string> = {
  '.llmview': 'gitignore',
  '.tsx': 'tsx',
  '.jsx': 'jsx',
  '.yml': 'yaml',
  '.mjs': 'js',
  '.cjs': 'js',
  '.mts': 'ts',
  '.cts': 'ts',
  '.sh': 'bash',
  '.zsh': 'bash',
  '.rb': 'ruby',
  '.rs': 'rust',
  '.kt': 'kotlin',
  '.cs': 'csharp',
};
