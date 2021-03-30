/**
 * @license
 * MIT License
 *
 * Copyright (c) 2018-2020 Martin Erlandsson, Jimbo
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */
/**
 * @fileoverview Entry point for building the SeedPicker offline web app.
 */

// Node modules.
import * as path from 'path';
import * as fs from 'fs-extra';

// NPM modules.
import {JSDOM} from 'jsdom';

async function main() {
  const calculatorDir = path.join(__dirname, '..', 'last-word', 'calculator');

  // Read last-word.html input file and create DOM for manipulating.
  const lastWordInputFile = path.join(calculatorDir, 'last-word.html');
  console.log(`Opening input file: ${lastWordInputFile}`);
  const lastWordInputHtml = await fs.readFile(lastWordInputFile, 'utf-8');
  const dom = new JSDOM(lastWordInputHtml);
  const doc = dom.window.document;

  // Replace bundle.js script element with inline code.
  const script = doc.querySelector('script[src="bundle.js"]');
  if (!script) {
    throw new Error('Could not find bundle script element.');
  }
  const bundleInputFile = path.join(calculatorDir, 'bundle.js');
  console.log(`Loading bundle file: ${bundleInputFile}`);
  const bundleInputJs = await fs.readFile(bundleInputFile, 'utf-8');
  script.removeAttribute('src');
  script.innerHTML =
    `<!--//--><![CDATA[//><!--\n${bundleInputJs}\n//--><!]]>`;

  // Find and replace stylesheets with inline content.
  const cssDir = path.join(__dirname, '..', 'last-word', 'css');
  const linkNodes = doc.querySelectorAll('link[rel="stylesheet"]');
  const styles = [];
  for (let i = 0; i < linkNodes.length; i++) {
    const linkNode = linkNodes[i];
    const href = linkNode.getAttribute('href');
    const cssFile = path.join(calculatorDir, href);
    if (path.relative(cssDir, cssFile).startsWith('..')) {
      throw new Error(`CSS file is outside of the css/ directory: ${cssFile}`);
    }
    if (!await fs.pathExists(cssFile)) {
      throw new Error(`CSS file does not exist: ${cssFile}`);
    }
    console.log(`Reading css file: ${cssFile}`);
    const cssContent = await fs.readFile(cssFile, 'utf-8');
    styles.push(cssContent);
    linkNode.parentNode.removeChild(linkNode);
  }
  console.log(`Inlining styles (${styles.length}).`);
  const styleNode = doc.createElement('style');
  styleNode.innerHTML = styles.join('\n');
  doc.head.appendChild(styleNode);

  // Create dist/ directory and output final HTML.
  const distDir = path.join(__dirname, '..', 'dist');
  const lastWordOutputFile = path.join(distDir, 'last-word.html');
  console.log(`Writing output file ${lastWordOutputFile}`);
  await fs.outputFile(lastWordOutputFile, dom.serialize());
}

main().catch(err => {
  throw err;
});

