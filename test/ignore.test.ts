import { describe, it, expect } from 'vitest';
import { createIgnore, isPathIgnored } from '../src/ignore';
import { ScopedIgnore } from '../src/types';

describe('isPathIgnored', () => {
  it('ignores matching file', () => {
    const ignores: ScopedIgnore[] = [{ ig: createIgnore('*.log'), scope: '' }];
    expect(isPathIgnored('debug.log', false, ignores)).toBe(true);
    expect(isPathIgnored('src/app.log', false, ignores)).toBe(true);
  });

  it('does not ignore non-matching file', () => {
    const ignores: ScopedIgnore[] = [{ ig: createIgnore('*.log'), scope: '' }];
    expect(isPathIgnored('index.ts', false, ignores)).toBe(false);
  });

  it('appends slash for directory checks', () => {
    const ignores: ScopedIgnore[] = [{ ig: createIgnore('build/'), scope: '' }];
    expect(isPathIgnored('build', true, ignores)).toBe(true);
    expect(isPathIgnored('build', false, ignores)).toBe(false);
  });

  it('handles scoped ignore relative to subdirectory', () => {
    const ignores: ScopedIgnore[] = [
      { ig: createIgnore('*.log'), scope: 'packages/app' },
    ];
    expect(isPathIgnored('packages/app/debug.log', false, ignores)).toBe(true);
    expect(isPathIgnored('debug.log', false, ignores)).toBe(false);
    expect(isPathIgnored('other/debug.log', false, ignores)).toBe(false);
  });

  it('later ignore can override earlier', () => {
    const ignores: ScopedIgnore[] = [
      { ig: createIgnore('*.log'), scope: '' },
      { ig: createIgnore('!important.log'), scope: '' },
    ];
    expect(isPathIgnored('debug.log', false, ignores)).toBe(true);
    expect(isPathIgnored('important.log', false, ignores)).toBe(false);
  });

  it('scoped ignores stack correctly', () => {
    const ignores: ScopedIgnore[] = [
      { ig: createIgnore('dist/'), scope: '' },
      { ig: createIgnore('!dist/'), scope: 'packages/special' },
    ];
    expect(isPathIgnored('dist', true, ignores)).toBe(true);
    expect(isPathIgnored('packages/special/dist', true, ignores)).toBe(false);
  });
});
