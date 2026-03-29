---
name: mdx-views
description: How to write and edit .mdx view files for llmview. Use this skill whenever creating, editing, or debugging an .mdx context file — including choosing globs, using props, mixing prose with <llmview> and <llmview-exec> tags, or designing effective LLM context. Also use when the user mentions "view file", "context file", ".mdx", or asks how to structure context for an LLM conversation.
---

# Writing .mdx view files

An `.mdx` file mixes markdown prose with two special self-closing tags that llmview replaces at render time:

- `<llmview ... />` — select and render files
- `<llmview-exec ... />` — run a shell command and include its stdout

Everything else passes through unchanged as prose. The prose matters — it gives the LLM reader orientation and framing.

## `<llmview>` tag

### Globs prop (required)

The `globs` prop is an array of glob patterns. Both single and double quotes work inside the array:

```mdx
<llmview globs={['src/**', '!src/generated/**']} />
<llmview globs={['src/**', '!src/generated/**']} />
```

Use `**` for recursive matching and `!` prefix for negation. Patterns are matched against the scanned directory tree (which already respects `.gitignore`).

### Boolean props

Write them bare (implicitly `true`) or explicitly:

```mdx
<llmview treeOnly globs={['**']} />
<llmview treeOnly={true} globs={['**']} />
```

### String props

Use double quotes (not curly braces) for string values:

```mdx
<llmview format="markdown" globs={['src/**']} />
```

### Available props

| Prop              | Type       | Effect                                                 |
| ----------------- | ---------- | ------------------------------------------------------ |
| `globs`           | `string[]` | **Required.** Glob patterns to select files.           |
| `format`          | `string`   | Output format: `xml` (default), `json`, `markdown`.    |
| `number`          | `boolean`  | Add line numbers to rendered file contents.            |
| `tree`            | `boolean`  | Prepend a directory tree of matched files.             |
| `treeOnly`        | `boolean`  | Show only the directory tree, skip file contents.      |
| `frontmatterOnly` | `boolean`  | Show only parsed YAML frontmatter from .md/.mdx files. |
| `list`            | `boolean`  | List matched file paths only.                          |
| `verbose`         | `boolean`  | Print file stats to stderr.                            |

Props on a tag override CLI defaults for that tag only.

## `<llmview-exec>` tag

Run a shell command and include its stdout. The `cmd` prop must use double quotes:

```mdx
<llmview-exec cmd="git log --oneline -10" />
<llmview-exec cmd="git diff main" />
```

## Prop syntax

- Array values: `globs={['src/**', '!src/generated/**']}`
- String values: `format="markdown"` — always use double quotes
- Boolean values: bare word (`treeOnly`) or explicit (`treeOnly={true}`)
- Tags must be self-closing (`/>`)
- The `globs` prop is required on `<llmview>` tags

## Designing effective context

### Structure with prose

Use markdown headings and short prose paragraphs between tags to orient the reader. Each section should explain _what_ the files are and _why_ they're included:

```mdx
## Database layer

These models define our core schema. The `User` model is the most important.

<llmview globs={['src/models/**']} />
```

### Layer detail levels

Combine `treeOnly` for broad orientation with full renders for the area of focus:

```mdx
## Project overview

<llmview treeOnly globs={['**']} />

## The code we're working on

<llmview globs={['src/auth/**']} />
```

### Use frontmatterOnly for large doc sets

When you have many markdown files with YAML frontmatter, show just the metadata to save tokens:

```mdx
## Available guides

<llmview frontmatterOnly globs={['docs/guides/*.md']} />
```

### Include the view file itself

Adding the view file as the last section lets the LLM understand how the context was assembled:

```mdx
## This context file

<llmview globs={['context.mdx']} />
```

### Add dynamic context with exec

Git history and diffs are especially useful for orienting an LLM on recent work:

```mdx
## Recent changes

<llmview-exec cmd="git log --oneline -10" />
<llmview-exec cmd="git diff main" />
```

## Example: full context file

```mdx
{/* llmview -v context.mdx | pbcopy */}

## Project structure

<llmview treeOnly globs={['**']} />

## Configuration

<llmview globs={['package.json', 'tsconfig.json', '.env.example']} />

## Source code

<llmview globs={['src/**', '!src/generated/**']} />

## Tests (structure only)

<llmview treeOnly globs={['test/**']} />

## Recent changes

<llmview-exec cmd="git log --oneline -10" />
<llmview-exec cmd="git diff main" />

## This context file

<llmview globs={['context.mdx']} />
```

The comment on line 1 is a reminder of the CLI invocation — `-v` prints stats to stderr, and `| pbcopy` copies the output to the clipboard.
