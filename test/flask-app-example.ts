import { file, dir } from './fixture';

export const flaskApp = `from flask import Flask

app = Flask(__name__)

@app.route("/")
def hello():
    return "Hello, World!"

if __name__ == "__main__":
    app.run(debug=True)`;

export const styleGuide = `# Style guide

Make no mistakes`;

export const projectTree = dir('', [
  dir('backend', [
    dir('backend/migrations', [
      file('backend/migrations/001_init.sql', 'CREATE TABLE users;'),
    ]),
    file('backend/main.py', flaskApp),
  ]),
  dir('docs', [file('docs/style_guide.md', styleGuide)]),
]);

export const patterns = [
  'backend/**',
  '!backend/migrations/**',
  'docs/style_guide.md',
];
