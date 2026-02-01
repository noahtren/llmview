# llmview

`llmview` is a small command-line tool for producing repeatable views of code for LLMs. You can configure views for different aspects of a large project and reuse them as the code evolves.

## Quick start

Install from npm

```bash
npm install -g llmview
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

A view is a list of glob patterns to select. It's the same format as `.gitignore`, but it says which patterns to select rather than ignore.

```gitignore
# Code
backend/**/**
!backend/migrations/**

# Docs
docs/style_guide.md
```

It will find all files that satisfy the glob patterns. It also respects existing `.gitignore` files (even nested ones) if your project is version controlled. If any files are ignored by git, they are also ignored here even if the view file would have selected it.

After selecting, it serializes the contents of each file into a LLM-friendly format and prints to stdout.

````
```
<file path="backend/main.py">
from flask import Flask

app = Flask(__name__)

@app.route("/")
def hello():
    return "Hello, World!"

if __name__ == "__main__":
    app.run(debug=True)

</file>
```

```
<file path="docs/style_guide.md">
# Style guide

Make no mistakes

</file>
```
````

### Including the project directory

The `-t` argument includes the file system hierarchy for all selected files at the beginning of the result.

````
```
<directory>
my_project/
    backend/
        main.py
    docs/
        style_guide.md
</directory>
```

```
<file path="my_project/backend/main.py">
...
````

### Including line numbers

The `-n` argument includes line numbers in each file, similar to `cat -n`. This uses more tokens, but can also be useful context.

### Only list selected files

The `-l` argument lets you use selected files for something else besides rendering the context to stdout. For example, to create a zip of selected files.

```bash
llmview .views/backend.llmview -l | zip context.zip -@
```

### Using `llmview` as a filter

Instead of reading from a view file, you can use it as a filter. For example, to render all the unstaged changes in your repo:

```bash
git diff --name-only | llmview -
```

## Renderers

This tool comes with a set of opinionated file renderers based on the file extension. Currently they are:

- CSV (truncated by default, preserving the header and the first 10 lines)
- Excel, media files, and other non-text formats (omitted)

There is also a max size of 250KB per file. If a code file is larger than that, it is not rendered. (If a CSV file is larger, it's still rendered and just truncated as usual.)

## Dry run to get statistics

To see what files will be included and an estimate of tokens used, try a command like this:

```bash
llmview -v .views/backend.llmview > /dev/null
```

This works because verbose information gets printed to stderr, and stdout goes to `/dev/null`.
