/**
 * An `.html` import is the file's own text, inlined into the bundle by
 * esbuild's `text` loader (`scripts/build.mjs`).
 *
 * That is what lets an e-mail body be written as an HTML file — reviewable,
 * openable in a browser — while the deployed function still reads nothing from
 * disk: `dist/` carries the bundle alone.
 */
declare module '*.html' {
  const content: string;

  export default content;
}
