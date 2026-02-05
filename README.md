# llmview

Generate LLM-friendly context from codebases using repeatable view files.

Designed for a middle ground in AI-assisted coding. Rather than copying files manually or relying on an LLM agent to search your codebase, define views once and reuse them as your code evolves. This can often "one-shot" problems by preparing the right context.

## Quick start

Install from npm

```bash
npm i -g llmview
```

Create any number of view files in your project. These can be saved anywhere. For example, a full-stack monorepo:

```
.views/
    backend.llmview
    frontend.llmview
    integration_tests.llmview
    new_feature.llmview
```

And use one:

```bash
llmview .views/backend.llmview
```

Run `llmview --help` for all options.

## How it works

A view is a list of glob patterns to select files. Use `**` for recursive matching.

```gitignore
# Code
backend/**
!backend/migrations/**

# Docs
docs/style_guide.md
```

After selecting, it outputs the contents of each file into a LLM-friendly format and prints to stdout.

```xml
<file path="backend/main.py">
from flask import Flask

app = Flask(__name__)

@app.route("/")
def hello():
    return "Hello, World!"

if __name__ == "__main__":
    app.run(debug=True)

</file>
<file path="docs/style_guide.md">
# Style guide

Make no mistakes

</file>
```

### Include the project directory

The `-t` argument includes the file system directory for all selected files at the beginning of the result.

```xml
<directory>
my_project/
    backend/
        main.py
    docs/
        style_guide.md
</directory>
<file path="backend/main.py">
...
```

### Include line numbers

The `-n` argument includes line numbers in each file, similar to `cat -n`. This uses more tokens, but can also be useful context.

### JSON output

The `-j` argument outputs the result as JSON instead of XML tags. This can be useful for piping into other tools like `jq`.

```bash
llmview -j .views/backend.llmview | jq '.files[].path'
```

The JSON structure:

```json
{
  "directory": null,
  "files": [
    {
      "path": "backend/main.py",
      "size": 245,
      "content": "..."
    }
  ]
}
```

The `directory` field is populated when using `-t`.

### Only list selected files

The `-l` argument lets you use selected files for something else besides rendering the context to stdout. For example, to create a zip of selected files.

```bash
llmview .views/backend.llmview -l | zip context.zip -@
```

### Using as a filter

Instead of reading from a view file, you can use it as a filter by reading from stdin. For example, to render all the unstaged changes in your repo:

```bash
git diff --name-only | llmview -
```

## Renderers

This tool comes with a set of opinionated file renderers based on the file extension. Currently they are:

- CSV (truncated by default, preserving the header and the first 10 lines)
- Excel, media files, and other non-text formats (omitted)

There is also a max size of 250KB per file. If a code file is larger than that, it is not rendered. (If a CSV file is larger, it's still rendered and just truncated as usual.)

## Verbose mode

To see what files will be included and an estimate of tokens used, use a verbose `-v` command like this:

```bash
llmview -v .views/backend.llmview > /dev/null
```

This works because verbose information gets printed to stderr, and stdout goes to `/dev/null`.
