# llmview

Reusable views of code for LLM context.

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

A view is a list of glob patterns to select files. Use `**` for recursive matching and `!` for negation.

```gitignore
# Code
backend/**
!backend/migrations/**

# Docs
docs/style_guide.md
```

The patterns are used to find files. The contents of each file are printed to stdout in XML tag format.

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

The `-n` argument includes line numbers in each file, similar to `cat -n`.

### Markdown format

The `-m` argument outputs the result as markdown with syntax-highlighted code blocks:

````
`src/main.py`
```py
from flask import Flask
...
```
````

### JSON format

The `-j` argument outputs the result as JSON instead of XML tags. This can be useful for piping into other tools like `jq`:

```bash
llmview -j .views/backend.llmview | jq '.files | length'
```

This is the JSON structure:

```json
{
  "files": [
    {
      "path": "backend/main.py",
      "size": 245,
      "content": "..."
    }
  ]
}
```

A `directory` field is populated when using `-t`.

You can generate a custom render format using `jq`, like:

```bash
llmview -j .views/backend.llmview | jq -r '.files[] | "**\(.path)**\n---\n\(.content)\n"'
```

### Only list selected files

The `-l` argument lists the selected files instead of rendering them. For example, to create a zip of selected files:

```bash
llmview .views/backend.llmview -l | zip context.zip -@
```

### Using as a filter

Instead of reading from a view file, you can use it as a filter by reading from stdin. For example, to render all the unstaged changes in your repo:

```bash
git diff --name-only | llmview -
```

## Renderers

There are some opinionated file renderers which are based on the file extension. Currently they are:

- CSV (truncated by default, preserving the header and the first 10 lines)
- Excel, media files, and other non-text formats (omitted)

If a file-specific renderer is not found, the default renderer is used. It assumes files are UTF-8 encoded and skips any files larger than 250KB.

## Verbose mode

To see what files will be included and a count of total output characters, use the verbose flag `-v`:

```bash
llmview -v .views/backend.llmview > /dev/null
```

Verbose information gets printed to stderr, and stdout goes to `/dev/null`.
