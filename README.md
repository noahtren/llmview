# llmview

Reusable views of code for LLM context.

Designed for a middle ground in AI-assisted coding. Rather than copying files manually or letting an LLM agent run its own commands to search your codebase, define views once and reuse them as your code evolves.

## Quick start

Install from npm:

```bash
npm i -g llmview
```

Create a `.mdx` file in your project that describes the context you want to share:

```mdx
This is my Python backend project.

## Project structure

<llmview treeOnly globs={['**']} />

## Project configuration

<llmview globs={['pyproject.toml', 'Makefile', '.gitignore']} />

## Application code

<llmview globs={['src/my_backend/**', '!src/my_backend/migrations/**']} />

## General documents

<llmview globs={['docs/*.md']} />

## Skills

<llmview frontmatterOnly globs={['skills/*/SKILL.md']} />

## Recent changes

<llmview-exec cmd="git log --oneline -10" />
<llmview-exec cmd="git diff main" />

## The file that generated this context

<llmview globs={['context.mdx']} />
```

Then render it:

```bash
llmview context.mdx
```

The output is a single document with your prose, file contents, and command output.

## Doc format

A `.mdx` file mixes markdown prose with `<llmview>` and `<llmview-exec>` tags. Prose passes through unchanged, while each tag is replaced with rendered output. llmview uses the MDX format to leverage JSX-like component and prop syntax, but it uses a text-only renderer that supports these two tags, rather than React components.

### `<llmview>` tag — include files

Select files with glob patterns. Use `**` for recursive matching and `!` for negation.

```mdx
<llmview globs={['src/my_backend/**', '!src/my_backend/migrations/**']} />
```

Each matched file is rendered in XML format by default:

```xml
<file path="src/my_backend/__init__.py" />
<file path="src/my_backend/app.py">
from flask import Flask

app = Flask(__name__)
...
</file>
```

#### Props

Every CLI option is also available as a prop on the `<llmview>` tag. Props set on a tag override the CLI defaults for that tag only.

| Prop              | Type       | CLI equivalent           | Description                                      |
| ----------------- | ---------- | ------------------------ | ------------------------------------------------ |
| `globs`           | `string[]` | _(positional patterns)_  | **Required.** Glob patterns to select files.     |
| `format`          | `string`   | `-f, --format`           | Output format: `xml`, `json`, or `markdown`.     |
| `number`          | `boolean`  | `-n, --number`           | Include line numbers in rendered files.          |
| `tree`            | `boolean`  | `-t, --tree`             | Include directory tree of selected files.        |
| `treeOnly`        | `boolean`  | `-T, --tree-only`        | Show only the directory tree, no file contents.  |
| `frontmatterOnly` | `boolean`  | `-F, --frontmatter-only` | Show only parsed YAML frontmatter, no file body. |
| `list`            | `boolean`  | `-l, --list`             | List selected files only.                        |
| `verbose`         | `boolean`  | `-v, --verbose`          | Print file statistics to stderr.                 |

Boolean props can be written bare (e.g. `treeOnly`) or explicitly (e.g. `treeOnly={true}`).

### `<llmview-exec>` tag — include command output

Run a shell command and include its stdout.

```mdx
<llmview-exec cmd="git diff main" />
```

## View files

For simpler cases, llmview also supports `.llmview` files. These are plain lists of glob patterns (with `#` comments), similar to `.gitignore`:

```gitignore
# Project configuration
pyproject.toml
Makefile
.gitignore

# Application code
src/my_backend/**
!src/my_backend/migrations/**

# Docs
docs/*.md
```

```bash
llmview context.llmview
```

## File handling

Files are handled differently based on their contents or extension:

- Binary files are excluded since their contents are not readable
- CSVs are truncated, preserving the header and the first 10 lines
- All other files are treated as UTF-8 text, with a 250KB size limit

The project's `.gitignore` files are automatically respected.

## CLI options

```
Usage: llmview [OPTIONS] <VIEW-FILE>

Arguments:
  <VIEW-FILE>    Path to a .mdx or .llmview file, or - for stdin

Options:
  -f, --format <FMT>      Output format: xml (default), json, markdown
  -l, --list              List selected files only
  -n, --number            Include line numbers in rendered files
  -t, --tree              Include directory tree of selected files
  -T, --tree-only         Show only the directory tree (no file contents)
  -F, --frontmatter-only  Show only parsed YAML frontmatter (no file body)
  -v, --verbose           Print file statistics to stderr
  -h, --help              Show this help message
  -V, --version           Show version number
```

### Output formats

Use `-f <format>` to choose the output format. The default is `xml`.

**XML** (`-f xml`) wraps each file in `<file path="...">` tags — the default and usually the best choice for LLM context.

**Markdown** (`-f markdown`) outputs syntax-highlighted code blocks:

````
`backend/main.py`
```py
from flask import Flask
...
```
````

**JSON** (`-f json`) is useful for piping into other tools:

```bash
llmview -f json context.llmview | jq '.files | length'
```

### Reading from stdin

Use `-` to read patterns from stdin. For example, to render all unstaged changes:

```bash
git diff --name-only | llmview -
```

### Verbose mode

Use `-v` to see what files are matched and character counts (printed to stderr):

```bash
llmview -v context.mdx > /dev/null
```

### Listing files

Use `-l` to list selected files without rendering. For example, to zip them:

```bash
llmview context.llmview -l | zip context.zip -@
```
