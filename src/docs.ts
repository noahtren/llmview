import { exec as execCb } from 'node:child_process';
import { promisify } from 'node:util';

import { scanDirectory } from './scan';
import { execute } from './execute';
import { LlmviewOptions } from './types';
import { style } from './util';

const exec = promisify(execCb);

const parseProps = (raw: string): LlmviewOptions => {
  const props: Record<string, unknown> = {};

  const kvRe = /(\w+)=(?:\{(\[.*?\]|[^}]*)\}|"([^"]*)")/g;
  let m: RegExpExecArray | null;

  while ((m = kvRe.exec(raw)) !== null) {
    const key = m[1];
    const value = m[2] ?? m[3];

    if (value === 'true') props[key] = true;
    else if (value === 'false') props[key] = false;
    else if (value.startsWith('[')) {
      props[key] = JSON.parse(value.replace(/'/g, '"'));
    } else {
      props[key] = value;
    }
  }

  const remainder = raw.replace(kvRe, '');
  const bareRe = /\b(\w+)\b/g;
  while ((m = bareRe.exec(remainder)) !== null) {
    props[m[1]] = true;
  }

  if (!props.globs || !Array.isArray(props.globs)) {
    throw new Error(`<llmview> requires a globs prop, got: ${raw}`);
  }

  return props as unknown as LlmviewOptions;
};

type Segment =
  | { type: 'prose'; text: string }
  | { type: 'llmview'; props: LlmviewOptions }
  | { type: 'exec'; cmd: string };

const parseCmdProp = (raw: string): string => {
  const m = /cmd="([^"]*)"/.exec(raw);
  if (!m) throw new Error('<llmview-exec> requires a cmd prop');
  return m[1];
};

const parse = (source: string): Segment[] => {
  const segments: Segment[] = [];
  const tagRe = /<(llmview(?:-exec)?)\s+(.*?)\/>/gs;
  let lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = tagRe.exec(source)) !== null) {
    if (m.index > lastIndex) {
      segments.push({ type: 'prose', text: source.slice(lastIndex, m.index) });
    }

    if (m[1] === 'llmview-exec') {
      segments.push({ type: 'exec', cmd: parseCmdProp(m[2]) });
    } else {
      segments.push({ type: 'llmview', props: parseProps(m[2]) });
    }

    lastIndex = m.index + m[0].length;
  }

  if (lastIndex < source.length) {
    segments.push({ type: 'prose', text: source.slice(lastIndex) });
  }

  return segments;
};

export type ResolveDefaults = Omit<LlmviewOptions, 'globs'>;

export const isDoc = (content: string): boolean =>
  /<llmview(?:-exec)?\s/.test(content);

const log = (message: string) => console.warn(message);

export const resolve = async (
  source: string,
  projectPath: string,
  defaults: ResolveDefaults = {}
): Promise<string> => {
  const segments = parse(source);
  const root = await scanDirectory(projectPath);
  const parts: string[] = [];

  for (const segment of segments) {
    if (segment.type === 'prose') {
      parts.push(segment.text);
      continue;
    }

    if (segment.type === 'exec') {
      const { stdout } = await exec(segment.cmd, { cwd: projectPath });

      if (defaults.verbose) {
        log(
          `${style(['green', 'bold'], 'Exec')} ${style('cyanBright', segment.cmd)}`
        );
        log(`${style('bold', stdout.length.toLocaleString())} chars`);
        log('');
      }

      parts.push(stdout);
      continue;
    }

    // Tag props override CLI defaults
    const { output } = await execute(
      projectPath,
      { ...defaults, ...segment.props },
      root
    );

    parts.push(output);
  }

  return parts.join('');
};
