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

## How it works

A view is a list of glob patterns to select files. Use `**` for recursive matching and `!` for negation. It automatically respects your project's `.gitignore` files.

```gitignore
# Code
backend/**
!backend/migrations/**

# Docs
docs/style_guide.md
```

Each matched file is printed to stdout in XML format.

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

## File handling

Files are handled differently based on their contents or extension:

- Binary files are excluded since their contents are not readable
- CSVs are truncated, preserving the header and the first 10 lines

Files without a specific renderer fall back to the default source code renderer. It assumes files are UTF-8 encoded and skips any files larger than 250KB.

## Rendering options

### Include the project directory

The `-t` argument includes a tree of matched files.

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

### Use line numbers

The `-n` argument includes line numbers in each file, similar to `cat -n`.

## Formats

### XML

This is the default format.

### Markdown

The `-m` argument outputs the result as markdown with syntax-highlighted code blocks:

````
`backend/main.py`
```py
from flask import Flask
...
```
````

### JSON

The `-j` argument outputs the result as JSON. This can be useful for piping into other tools like `jq`:

```bash
llmview -j .views/backend.llmview | jq '.files | length'
```

This is the JSON structure:

```json
{
  "files": [
    {
      "path": "backend/main.py",
      "size": 155,
      "content": "from flask import Flask\n..."
    }
  ]
}
```

A `directory` field is populated when using `-t`.

## Other uses

### Only list selected files

The `-l` argument lists the selected files instead of rendering them. For example, to create a zip of selected files:

```bash
llmview .views/backend.llmview -l | zip context.zip -@
```

### Using as a filter

Use `-` to read from stdin instead of a file. For example, to render all the unstaged changes in your repo:

```bash
git diff --name-only | llmview -
```

### Verbose mode

To see what files will be included and a count of total output characters, use the verbose flag `-v`:

```bash
llmview -v .views/backend.llmview > /dev/null
```

Verbose information gets printed to stderr, and stdout goes to `/dev/null`.

### Custom format by parsing JSON

You can generate a custom render format from the JSON format using `jq`:

```bash
llmview -j .views/backend.llmview | jq -r '.files[] | "**\(.path)**\n---\n\(.content)\n"'
```
