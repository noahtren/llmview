import { InspectColor, styleText } from 'node:util';

export const style = (
  fmt: InspectColor | InspectColor[],
  text: string
): string => styleText(fmt, text, { stream: process.stderr });
