/**
 * human-typer.js — Natural typing simulation for Playwright
 *
 * Simulates human-like typing with variable speed, pauses at punctuation,
 * occasional typos with correction, and thinking pauses.
 */

const NEARBY_KEYS = {
  a: 'sqwz', b: 'vngh', c: 'xvdf', d: 'sfce', e: 'rdw3',
  f: 'dgcv', g: 'fhtb', h: 'gjyn', i: 'uko8', j: 'hkum',
  k: 'jli9', l: 'ko0p', m: 'njk', n: 'bmhj', o: 'ip90',
  p: 'ol0', q: 'wa12', r: 'etf4', s: 'adwx', t: 'ryg5',
  u: 'yij7', v: 'cfgb', w: 'qse2', x: 'zsdc', y: 'tuh6',
  z: 'asx',
};

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function nearbyKey(ch) {
  const lower = ch.toLowerCase();
  const neighbors = NEARBY_KEYS[lower];
  if (!neighbors) return ch === ch.toUpperCase() ? ch.toLowerCase() : ch.toUpperCase();
  const picked = neighbors[rand(0, neighbors.length - 1)];
  return ch === ch.toUpperCase() ? picked.toUpperCase() : picked;
}

/**
 * Type text into a focused element with human-like behavior.
 *
 * @param {import('playwright').Page} page
 * @param {string} selector  CSS selector for the input element
 * @param {string} text      The text to type
 * @param {object} [opts]
 * @param {number} [opts.minDelay=50]   Min ms between keystrokes
 * @param {number} [opts.maxDelay=150]  Max ms between keystrokes
 * @param {number} [opts.typoRate=0.05] Probability of a typo per character
 * @param {number} [opts.thinkRate=0.03] Probability of a "thinking" pause
 */
async function humanType(page, selector, text, opts = {}) {
  const {
    minDelay = 50,
    maxDelay = 150,
    typoRate = 0.05,
    thinkRate = 0.03,
  } = opts;

  await page.click(selector);
  await sleep(rand(200, 500)); // settle after click

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    // Thinking pause (3%)
    if (Math.random() < thinkRate) {
      await sleep(rand(1000, 2000));
    }

    // Typo then correct (5%) — only for letters
    if (/[a-zA-Z]/.test(ch) && Math.random() < typoRate) {
      const wrong = nearbyKey(ch);
      await page.keyboard.type(wrong, { delay: rand(minDelay, maxDelay) });
      await sleep(rand(100, 300)); // notice the mistake
      await page.keyboard.press('Backspace');
      await sleep(rand(80, 200));
    }

    // Type the correct character
    await page.keyboard.type(ch, { delay: rand(minDelay, maxDelay) });

    // Pause after punctuation
    if ('.!?'.includes(ch)) {
      await sleep(rand(300, 800)); // end of sentence
    } else if (',;:'.includes(ch)) {
      await sleep(rand(200, 500)); // clause break
    } else if (ch === '\n') {
      await sleep(rand(400, 900)); // new line / paragraph
    }
  }
}

/**
 * Type into a contenteditable element (like ChatGPT's ProseMirror editor).
 * Falls back to humanType with the given selector.
 *
 * @param {import('playwright').Page} page
 * @param {string} selector
 * @param {string} text
 * @param {object} [opts]
 */
async function humanTypeContentEditable(page, selector, text, opts = {}) {
  // For contenteditable, click to focus then type via keyboard
  await page.click(selector);
  await sleep(rand(200, 500));

  const {
    minDelay = 50,
    maxDelay = 150,
    typoRate = 0.05,
    thinkRate = 0.03,
  } = opts;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (Math.random() < thinkRate) {
      await sleep(rand(1000, 2000));
    }

    if (/[a-zA-Z]/.test(ch) && Math.random() < typoRate) {
      const wrong = nearbyKey(ch);
      await page.keyboard.type(wrong, { delay: rand(minDelay, maxDelay) });
      await sleep(rand(100, 300));
      await page.keyboard.press('Backspace');
      await sleep(rand(80, 200));
    }

    if (ch === '\n') {
      await page.keyboard.press('Enter');
      await sleep(rand(400, 900));
    } else {
      await page.keyboard.type(ch, { delay: rand(minDelay, maxDelay) });
    }

    if ('.!?'.includes(ch)) {
      await sleep(rand(300, 800));
    } else if (',;:'.includes(ch)) {
      await sleep(rand(200, 500));
    }
  }
}

module.exports = { humanType, humanTypeContentEditable };
