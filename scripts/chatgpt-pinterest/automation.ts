import { chromium, Browser, BrowserContext, Page, Download } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PinConfig {
  prompt: string;
  title: string;
  description?: string;
  board: string;
  link?: string;
}

interface AutomationConfig {
  settings?: {
    headless?: boolean;
    delayBetweenPins?: number;
  };
  pins: PinConfig[];
}

interface SavedSession {
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
  }>;
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const SCRIPT_DIR = path.resolve(__dirname);
const SESSIONS_DIR = path.join(SCRIPT_DIR, '.sessions');
const DOWNLOADS_DIR = path.join(SCRIPT_DIR, 'downloads');
const CHATGPT_SESSION = path.join(SESSIONS_DIR, 'chatgpt.json');
const PINTEREST_SESSION = path.join(SESSIONS_DIR, 'pinterest.json');
const CONFIG_FILE = path.join(SCRIPT_DIR, 'prompts.json');

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function ensureDirs() {
  [SESSIONS_DIR, DOWNLOADS_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));
}

function log(msg: string) {
  console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
}

function downloadUrl(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    proto
      .get(url, res => {
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      })
      .on('error', err => {
        fs.unlink(dest, () => {});
        reject(err);
      });
  });
}

async function saveSession(context: BrowserContext, file: string) {
  const cookies = await context.cookies();
  const session: SavedSession = { cookies };
  fs.writeFileSync(file, JSON.stringify(session, null, 2));
}

async function loadSession(context: BrowserContext, file: string) {
  const session: SavedSession = JSON.parse(fs.readFileSync(file, 'utf-8'));
  await context.addCookies(session.cookies);
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function makeContext(browser: Browser) {
  return browser.newContext({
    viewport: { width: 1280, height: 900 },
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    acceptDownloads: true,
  });
}

// ---------------------------------------------------------------------------
// Setup: save login sessions interactively
// ---------------------------------------------------------------------------

async function setupChatGPT(browser: Browser): Promise<void> {
  log('Opening ChatGPT — log in manually, then the script will continue automatically.');
  const ctx = await makeContext(browser);
  const page = await ctx.newPage();

  await page.goto('https://chatgpt.com', { waitUntil: 'domcontentloaded' });

  // Wait until the main prompt textarea is visible (means the user is logged in)
  await page.waitForSelector('#prompt-textarea', { timeout: 300_000 });
  log('ChatGPT login detected.');

  await saveSession(ctx, CHATGPT_SESSION);
  log(`Session saved → ${CHATGPT_SESSION}`);
  await ctx.close();
}

async function setupPinterest(browser: Browser): Promise<void> {
  log('Opening Pinterest — log in manually, then the script will continue automatically.');
  const ctx = await makeContext(browser);
  const page = await ctx.newPage();

  await page.goto('https://www.pinterest.com', { waitUntil: 'domcontentloaded' });

  // Wait for the "Create" / pin-builder button that only appears when logged in
  await page.waitForSelector(
    '[data-test-id="header-create-button"], a[href*="/pin-builder"]',
    { timeout: 300_000 }
  );
  log('Pinterest login detected.');

  await saveSession(ctx, PINTEREST_SESSION);
  log(`Session saved → ${PINTEREST_SESSION}`);
  await ctx.close();
}

// ---------------------------------------------------------------------------
// ChatGPT: generate an image and return the local file path
// ---------------------------------------------------------------------------

async function generateImageOnChatGPT(
  browser: Browser,
  prompt: string,
  index: number
): Promise<string> {
  const ctx = await makeContext(browser);
  await loadSession(ctx, CHATGPT_SESSION);
  const page = await ctx.newPage();

  try {
    log(`  Navigating to ChatGPT…`);
    await page.goto('https://chatgpt.com', { waitUntil: 'networkidle' });

    // Start a fresh chat each time
    const newChatLink = page.locator('nav a[href="/"]').first();
    if (await newChatLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newChatLink.click();
      await sleep(1000);
    }

    // Type the prompt
    const input = page.locator('#prompt-textarea');
    await input.waitFor({ timeout: 30_000 });
    await input.click();
    // Use fill for plain text, then shift+enter won't be needed
    await input.fill(`Generate an image: ${prompt}`);
    await page.keyboard.press('Enter');

    log(`  Waiting for DALL-E to generate the image (up to 3 min)…`);

    // Strategy 1: wait for a download button to appear next to the generated image
    // and use Playwright's download event — most reliable approach.
    const downloadBtn = page.locator(
      'button[aria-label*="Download"], button[aria-label*="download"], [data-testid*="download"]'
    ).first();

    let imagePath: string;

    const downloadBtnVisible = await downloadBtn
      .waitFor({ state: 'visible', timeout: 120_000 })
      .then(() => true)
      .catch(() => false);

    if (downloadBtnVisible) {
      log(`  Download button found — clicking…`);
      const [download]: [Download] = await Promise.all([
        page.waitForEvent('download'),
        downloadBtn.click(),
      ]);
      const ext = download.suggestedFilename().split('.').pop() ?? 'png';
      imagePath = path.join(DOWNLOADS_DIR, `pin_${index + 1}_${Date.now()}.${ext}`);
      await download.saveAs(imagePath);
    } else {
      // Strategy 2: grab the <img> src from the assistant response and fetch it
      // in the page context so auth cookies are included.
      log(`  No download button found — grabbing image src directly…`);
      const img = page.locator('div[data-message-author-role="assistant"] img').last();
      await img.waitFor({ state: 'visible', timeout: 30_000 });

      const src = await img.getAttribute('src');
      if (!src) throw new Error('Could not find image src in ChatGPT response.');

      imagePath = path.join(DOWNLOADS_DIR, `pin_${index + 1}_${Date.now()}.png`);

      if (src.startsWith('data:')) {
        // Inline base64 image
        const b64 = src.split(',')[1];
        fs.writeFileSync(imagePath, Buffer.from(b64, 'base64'));
      } else {
        // Remote URL — fetch inside the page so cookies are sent
        const buffer: number[] = await page.evaluate(async (url: string) => {
          const res = await fetch(url);
          return Array.from(new Uint8Array(await res.arrayBuffer()));
        }, src);
        fs.writeFileSync(imagePath, Buffer.from(buffer));
      }
    }

    log(`  Image saved → ${path.basename(imagePath)}`);
    return imagePath;
  } finally {
    await ctx.close();
  }
}

// ---------------------------------------------------------------------------
// Pinterest: upload image and publish a pin
// ---------------------------------------------------------------------------

async function createPinterestPin(
  browser: Browser,
  imagePath: string,
  pin: PinConfig
): Promise<void> {
  const ctx = await makeContext(browser);
  await loadSession(ctx, PINTEREST_SESSION);
  const page = await ctx.newPage();

  try {
    log(`  Navigating to Pinterest pin builder…`);
    await page.goto('https://www.pinterest.com/pin-builder/', { waitUntil: 'networkidle' });

    // Upload the image file
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.waitFor({ timeout: 20_000 });
    await fileInput.setInputFiles(imagePath);
    log(`  Image uploaded, waiting for processing…`);
    await sleep(4000);

    // Fill in title
    const titleField = page
      .locator(
        '[data-test-id="pin-draft-title"] input, input[placeholder*="title" i]'
      )
      .first();
    await titleField.waitFor({ timeout: 20_000 });
    await titleField.fill(pin.title);

    // Fill in description (optional)
    if (pin.description) {
      const descField = page
        .locator(
          '[data-test-id="pin-draft-description"] div[contenteditable], textarea[placeholder*="description" i]'
        )
        .first();
      const descVisible = await descField.isVisible({ timeout: 5000 }).catch(() => false);
      if (descVisible) await descField.fill(pin.description);
    }

    // Fill in destination link (optional)
    if (pin.link) {
      const linkField = page
        .locator('[data-test-id="pin-draft-link"] input, input[placeholder*="link" i]')
        .first();
      const linkVisible = await linkField.isVisible({ timeout: 5000 }).catch(() => false);
      if (linkVisible) await linkField.fill(pin.link);
    }

    // Open board selector
    const boardBtn = page
      .locator('[data-test-id="board-dropdown-select-button"]')
      .first();
    await boardBtn.waitFor({ timeout: 15_000 });
    await boardBtn.click();
    await sleep(500);

    // Search for the board by name
    const boardSearch = page
      .locator(
        '[data-test-id="board-dropdown-search-input"] input, input[placeholder*="Search boards" i]'
      )
      .first();
    const boardSearchVisible = await boardSearch.isVisible({ timeout: 3000 }).catch(() => false);
    if (boardSearchVisible) {
      await boardSearch.fill(pin.board);
      await sleep(1000);
    }

    // Click the matching board option
    const boardOption = page
      .locator(`[data-test-id="board-option"]:has-text("${pin.board}")`)
      .first();
    await boardOption.waitFor({ timeout: 15_000 });
    await boardOption.click();
    await sleep(500);

    // Publish
    const saveBtn = page
      .locator(
        '[data-test-id="board-dropdown-save-button"], button:has-text("Publish"), button:has-text("Save")'
      )
      .first();
    await saveBtn.waitFor({ timeout: 10_000 });
    await saveBtn.click();

    // Give Pinterest time to process the publish
    await sleep(4000);
    log(`  Pin published → board: "${pin.board}"`);
  } finally {
    await ctx.close();
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const isSetup = process.argv.includes('--setup');
  ensureDirs();

  if (!isSetup && !fs.existsSync(CONFIG_FILE)) {
    console.error(
      `\nConfig file not found: ${CONFIG_FILE}\n` +
        `Copy prompts.example.json → prompts.json and fill in your pins.\n`
    );
    process.exit(1);
  }

  const config: AutomationConfig = isSetup
    ? { pins: [] }
    : JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));

  // Setup always runs headed so the user can log in
  const headless = isSetup ? false : (config.settings?.headless ?? false);

  const browser = await chromium.launch({
    headless,
    slowMo: headless ? 0 : 30,
    args: ['--no-sandbox'],
  });

  try {
    if (isSetup) {
      console.log('\n=== First-time Setup ===\n');
      console.log('You will need to log in to ChatGPT and Pinterest.');
      console.log('The script will detect when you are logged in and save the session.\n');
      await setupChatGPT(browser);
      await setupPinterest(browser);
      console.log('\nSetup complete! Now run: npm start\n');
      return;
    }

    // Validate sessions exist
    if (!fs.existsSync(CHATGPT_SESSION)) {
      console.error('No ChatGPT session found. Run: npm run setup');
      process.exit(1);
    }
    if (!fs.existsSync(PINTEREST_SESSION)) {
      console.error('No Pinterest session found. Run: npm run setup');
      process.exit(1);
    }

    const total = config.pins.length;
    if (total === 0) {
      console.warn('No pins configured in prompts.json.');
      return;
    }

    console.log(`\nStarting automation — ${total} pin(s) to process.\n`);

    for (let i = 0; i < total; i++) {
      const pin = config.pins[i];
      console.log(`\n── Pin ${i + 1}/${total}: "${pin.title}" ──`);

      log('Step 1/2 — Generating image on ChatGPT…');
      const imagePath = await generateImageOnChatGPT(browser, pin.prompt, i);

      log('Step 2/2 — Creating Pinterest pin…');
      await createPinterestPin(browser, imagePath, pin);

      if (i < total - 1) {
        const delay = config.settings?.delayBetweenPins ?? 8000;
        log(`Pausing ${delay / 1000}s before next pin…`);
        await sleep(delay);
      }
    }

    console.log(`\nDone! All ${total} pin(s) processed.\n`);
  } finally {
    await browser.close().catch(() => {});
  }
}

main().catch(err => {
  console.error('\nFatal error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
