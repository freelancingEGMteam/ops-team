"""
====================================================
  SpinOFacts — Step 1: Image Generation
====================================================
Connects to your already-open Chrome browser using
remote debugging. This uses your real Chrome profile
and existing ChatGPT session — no login needed.

HOW IT WORKS:
  Generates all scenes in CSV order (scene 01, 02, 03...).
  No character reference images — SpinOFacts scenes are
  prompt-only. Each scene is identified by its scene_number.

CSV FORMAT (prompts.csv):
  scene_number, script, image_prompt, animation_prompt

RESUME SUPPORT:
  If the script stops, just re-run it. Already-completed
  scenes are skipped automatically via progress.json.

AUTO_RUN:
  Set AUTO_RUN = True to run fully unattended (overnight).
  Set AUTO_RUN = False to pause for confirmation at start.

HOW TO LAUNCH CHROME BEFORE RUNNING:
  1. Close all Chrome windows completely
  2. Run the Launch-Chrome.ps1 script in PowerShell
  3. Go to chatgpt.com, start a NEW chat, leave ready
  4. Run: python generate.py

Requirements:
    pip install playwright
    playwright install chromium
====================================================
"""

import asyncio
import random
import csv
import os
import json
import logging
from playwright.async_api import async_playwright

# -----------------------------------------------------------------
# CONFIG
# -----------------------------------------------------------------
CSV_FILE             = os.path.join(os.path.dirname(__file__), "prompts.csv")
PROGRESS_FILE        = os.path.join(os.path.dirname(__file__), "progress.json")
DOWNLOAD_ORDER_FILE  = os.path.join(os.path.dirname(__file__), "download_order.json")
CHROME_DEBUG_URL     = "http://localhost:9222"
CHATGPT_URL          = "https://chatgpt.com"
WAIT_AFTER_SEND_SEC      = 60   # base wait after sending prompt
WAIT_BUFFER_SEC          = 30   # extra buffer if no image after base wait
MIN_WAIT_AFTER_IMAGE_SEC = 30   # minimum wait even if image confirmed early
WAIT_BETWEEN_PROMPTS_SEC = 20   # cooldown between prompts

# Set to True to run fully unattended (no ENTER prompts).
# Set to False to pause for confirmation at start.
AUTO_RUN = False

# -----------------------------------------------------------------
# LOGGING
# -----------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("generate.log", encoding="utf-8"),
        logging.StreamHandler()
    ]
)
log = logging.getLogger(__name__)


# -----------------------------------------------------------------
# PROGRESS TRACKING
# -----------------------------------------------------------------

def load_progress() -> set:
    if os.path.exists(PROGRESS_FILE):
        try:
            with open(PROGRESS_FILE, "r", encoding="utf-8") as f:
                return set(json.load(f))
        except Exception:
            pass
    return set()


def save_progress(scene_id: str):
    completed = load_progress()
    completed.add(scene_id)
    with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
        json.dump(list(completed), f, indent=2)


# -----------------------------------------------------------------
# DOWNLOAD ORDER TRACKING
# -----------------------------------------------------------------

def load_download_order() -> list:
    if os.path.exists(DOWNLOAD_ORDER_FILE):
        try:
            with open(DOWNLOAD_ORDER_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return []


def append_download_order(scene_id: str):
    order = load_download_order()
    if scene_id not in order:
        order.append(scene_id)
        with open(DOWNLOAD_ORDER_FILE, "w", encoding="utf-8") as f:
            json.dump(order, f, indent=2)


# -----------------------------------------------------------------
# CSV STATUS / NOTE / MANUAL_REVIEW UPDATES
# -----------------------------------------------------------------

def _update_csv_field(scene_number: str, field: str, value: str):
    """Generic CSV field updater keyed by scene_number. Adds column if missing."""
    if not os.path.exists(CSV_FILE):
        return
    try:
        rows       = []
        fieldnames = []
        with open(CSV_FILE, newline="", encoding="utf-8-sig") as f:
            reader     = csv.DictReader(f)
            fieldnames = reader.fieldnames[:]
            if field not in fieldnames:
                fieldnames.append(field)
            for row in reader:
                if field not in row:
                    row[field] = ""
                if row.get("scene_number", "").strip() == scene_number:
                    row[field] = value
                rows.append(row)
        with open(CSV_FILE, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames, quoting=csv.QUOTE_ALL)
            writer.writeheader()
            writer.writerows(rows)
        log.info(f"  -> CSV {field} updated: {scene_number} = {value}")
    except Exception as e:
        log.warning(f"  -> Could not update CSV {field} for '{scene_number}': {e}")


def update_csv_status(scene_number: str, status: str):
    _update_csv_field(scene_number, "generation_status", status)


def update_csv_note(scene_number: str, note: str):
    _update_csv_field(scene_number, "notes", note)


def update_csv_manual_review(scene_number: str, value: str):
    _update_csv_field(scene_number, "manual_review", value)


# -----------------------------------------------------------------
# CSV READER
# -----------------------------------------------------------------

def load_prompts() -> list:
    prompts = []
    if not os.path.exists(CSV_FILE):
        log.error(f"CSV file not found: {CSV_FILE}")
        return prompts
    with open(CSV_FILE, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            scene_number  = row.get("scene_number", "").strip()
            image_prompt  = row.get("image_prompt", "").strip()
            manual_review = row.get("manual_review", "no").strip().lower()
            if scene_number and image_prompt:
                prompts.append({
                    "scene_number":  scene_number,
                    "image_prompt":  image_prompt,
                    "manual_review": manual_review,
                })
            else:
                log.warning(f"Skipping incomplete row: {row}")
    return prompts


# -----------------------------------------------------------------
# HUMAN-LIKE HELPERS
# -----------------------------------------------------------------

def rand_int(a, b):
    return random.randint(a, b)

async def human_delay(min_ms=300, max_ms=900):
    await asyncio.sleep(rand_int(min_ms, max_ms) / 1000)

async def human_type(page, selector, text):
    await page.click(selector)
    await human_delay(200, 500)
    for char in text:
        if char == "\n":
            await page.keyboard.press("Shift+Enter")
        else:
            await page.keyboard.type(char)
        await asyncio.sleep(rand_int(30, 90) / 1000)
        if random.random() < 0.05:
            await human_delay(200, 600)

async def human_scroll(page):
    amount = rand_int(100, 350)
    await page.evaluate(f"window.scrollBy({{top:{amount},behavior:'smooth'}})")
    await human_delay(400, 900)

async def mouse_stay_in_prompt(page):
    """Small natural micro-movement within the prompt textarea area."""
    try:
        input_box = page.locator("#prompt-textarea")
        box       = await input_box.bounding_box()
        if box:
            x = box["x"] + rand_int(10, int(box["width"]) - 10)
            y = box["y"] + rand_int(5,  int(box["height"]) - 5)
            await page.mouse.move(x, y)
            await human_delay(100, 300)
    except Exception:
        pass


# -----------------------------------------------------------------
# IMAGE COMPARISON HANDLER
# ChatGPT sometimes generates two versions and asks which is better.
# We always click Skip to keep the pipeline moving without human input.
# -----------------------------------------------------------------

async def handle_image_comparison(page) -> bool:
    """
    Detects ChatGPT's image comparison UI and clicks Skip.
    Returns True if comparison was detected and handled.
    """
    try:
        skip_btn = page.locator('button:has-text("Skip")')
        if await skip_btn.count() > 0:
            await skip_btn.first.click()
            await asyncio.sleep(1)
            log.info("  -> Image comparison detected — clicked Skip")
            print(f"\n  ⏭️  Image comparison detected — clicked Skip.")
            return True

        page_text = await page.inner_text("body")
        if "image 1" in page_text.lower() and "image 2" in page_text.lower():
            skip_btn2 = page.locator('button:has-text("Skip")')
            if await skip_btn2.count() > 0:
                await skip_btn2.first.click()
                await asyncio.sleep(1)
                log.info("  -> Image comparison (text detected) — clicked Skip")
                print(f"\n  ⏭️  Image comparison detected — clicked Skip.")
                return True
    except Exception as e:
        log.debug(f"  -> handle_image_comparison: {e}")
    return False


# -----------------------------------------------------------------
# MAIN GENERATION LOOP
# -----------------------------------------------------------------

async def run_all_scenes(page, all_prompts: list):

    completed   = load_progress()
    to_generate = [
        p for p in all_prompts
        if p["manual_review"] != "yes" and p["scene_number"] not in completed
    ]
    total     = len(to_generate)
    total_all = len([p for p in all_prompts if p["manual_review"] != "yes"])

    print(f"\n  📊 Generation status:")
    print(f"     Total auto-generate scenes: {total_all}")
    print(f"     Already completed:          {total_all - total}")
    print(f"     Remaining to generate:      {total}")

    if not to_generate:
        print("\n  ✅ All scenes already completed!")
        return

    content_violation_phrases = [
        "content policy",
        "policy violation",
        "violates our",
        "against our policies",
        "i can't create",
        "i cannot create",
        "i'm not able to create",
        "i wasn't able to create",
        "unable to create images",
        "this request",
    ]
    limit_phrases = [
        "image limit",
        "generation limit",
        "you've reached",
        "you have reached",
        "limit reached",
        "try again later",
        "upgrade your plan",
        "unable to generate",
    ]

    for i, item in enumerate(to_generate):
        scene_number = item["scene_number"]
        prompt       = item["image_prompt"]
        current      = i + 1

        print("\n" + "─" * 55)
        print(f"  🎬 {scene_number}  |  {current} of {total} remaining")
        print("─" * 55)

        log.info(f"[{current}/{total}] {scene_number}")

        try:
            await human_delay(800, 2000)
            await mouse_stay_in_prompt(page)
            await human_delay(500, 1200)

            # ── Snapshot baseline images already on page ──────────────────
            baseline_srcs: set = set()
            try:
                for selector in [
                    "img[alt^='Generated image:']",
                    "img[alt='Generated image']",
                    "img[alt='Image attachment']",
                    "img[src*='estuary']",
                    "img[src*='oaiusercontent']",
                ]:
                    existing_imgs = await page.locator(selector).all()
                    for _img in existing_imgs:
                        _src = await _img.get_attribute("src")
                        if _src:
                            baseline_srcs.add(_src)
                log.info(f"  -> Baseline image count: {len(baseline_srcs)}")
            except Exception:
                pass

            # ── Type and send the prompt ──────────────────────────────────
            print(f"  ✍️  Typing image prompt...")
            input_selector = "#prompt-textarea"
            await page.wait_for_selector(input_selector, timeout=15000)
            await page.click(input_selector)
            await human_delay(300, 600)
            await page.keyboard.press("Control+a")
            await page.keyboard.press("Backspace")
            await human_delay(200, 500)
            await human_type(page, input_selector, prompt)
            print(f"  ✅ Prompt typed.")

            await human_delay(800, 2000)
            await page.keyboard.press("Enter")
            print(f"  🚀 Sent! Waiting for image...")
            log.info(f"  -> Sent.")

            # ── Polling image check ───────────────────────────────────────
            image_confirmed   = False
            content_violation = False
            limit_hit         = False
            confirmed_at      = None
            extended          = False
            total_wait        = WAIT_AFTER_SEND_SEC + WAIT_BUFFER_SEC

            for elapsed in range(total_wait):
                if image_confirmed and confirmed_at is not None:
                    min_remaining = max(0, MIN_WAIT_AFTER_IMAGE_SEC - (elapsed - confirmed_at))
                    if min_remaining > 0:
                        print(f"  ✅ Image confirmed — minimum wait: {min_remaining}s   ", end="\r")
                    else:
                        break
                else:
                    status_label  = "Buffer" if elapsed >= WAIT_AFTER_SEND_SEC else "Generating"
                    remaining_sec = total_wait - elapsed
                    print(f"  ⏳ {status_label}... {remaining_sec}s remaining   ", end="\r")

                await asyncio.sleep(1)

                if elapsed % 10 == 0 and elapsed > 0:
                    await mouse_stay_in_prompt(page)
                    await page.bring_to_front()

                    try:
                        await handle_image_comparison(page)

                        new_image_found = False
                        for img_selector in [
                            "img[alt^='Generated image:']",
                            "img[alt='Generated image']",
                            "img[alt='Image attachment']",
                            "img[src*='estuary']",
                            "img[src*='oaiusercontent']",
                        ]:
                            imgs = await page.locator(img_selector).all()
                            for img in imgs:
                                src = await img.get_attribute("src")
                                if src and src not in baseline_srcs:
                                    if not image_confirmed:
                                        image_confirmed = True
                                        confirmed_at    = elapsed
                                        print()
                                        print(f"  ✅ Image detected at {elapsed}s — holding {MIN_WAIT_AFTER_IMAGE_SEC}s minimum...")
                                    new_image_found = True
                                    break
                            if new_image_found:
                                break

                        if image_confirmed:
                            continue

                        page_text  = await page.inner_text("body")
                        page_lower = page_text.lower()

                        if any(phrase in page_lower for phrase in content_violation_phrases):
                            content_violation = True
                            break

                        if any(phrase in page_lower for phrase in limit_phrases):
                            limit_hit = True
                            break

                    except Exception:
                        pass

                if elapsed == WAIT_AFTER_SEND_SEC and not image_confirmed and not extended:
                    print()
                    print(f"  ⏳ No image yet — extending {WAIT_BUFFER_SEC}s buffer...")
                    extended = True

            print()

            # ── Handle result ─────────────────────────────────────────────

            if limit_hit:
                print("\n" + "=" * 55)
                print("  🛑 IMAGE GENERATION LIMIT REACHED!")
                print("=" * 55)
                print(f"  Last scene attempted: {scene_number}")
                print(f"  All progress saved. When limit resets:")
                print(f"  1. Leave Chrome open on the ChatGPT conversation")
                print(f"  2. Run python generate.py again")
                print(f"  3. It will resume automatically from where it stopped")
                print("=" * 55 + "\n")
                log.warning(f"Generation limit hit at {scene_number}. Paused.")
                return

            if content_violation:
                print(f"  🚫 Content violation — {scene_number} flagged in CSV.")
                print(f"  ⏭️  Moving to next scene...")
                log.warning(f"  -> Content violation: {scene_number}")
                update_csv_status(scene_number, "failed")
                update_csv_note(scene_number, "Content violation - change prompt")
                update_csv_manual_review(scene_number, "yes")
                continue

            if not image_confirmed:
                print(f"  ⚠️  No image after {total_wait}s — {scene_number} will retry on next run.")
                log.warning(f"  -> No image confirmed: {scene_number}")
                update_csv_status(scene_number, "failed")
                continue

            save_progress(scene_number)
            append_download_order(scene_number)
            update_csv_status(scene_number, "done")
            print(f"  ✅ {scene_number} complete!")
            log.info(f"  -> Done: {scene_number}")

            if i < total - 1:
                gap = WAIT_BETWEEN_PROMPTS_SEC + rand_int(3, 10)
                for r in range(gap, 0, -1):
                    print(f"  ⏸  Cooling down... {r}s before next scene   ", end="\r")
                    await asyncio.sleep(1)
                print(f"  ➡️  Moving to next scene...                        ")

        except Exception as e:
            print(f"  ❌ ERROR on {scene_number}: {e}")
            print(f"  ⏭️  Skipping — progress saved.")
            log.error(f"  -> ERROR: {scene_number}: {e}")
            continue

    print(f"\n  🏁 All scenes processed!")
    log.info("All scenes processed.")


# -----------------------------------------------------------------
# MAIN
# -----------------------------------------------------------------

async def main():
    print("\n" + "=" * 55)
    print("  🎬 SpinOFacts — Image Generation Pipeline")
    print("=" * 55)
    print()
    print("  Scenes are generated in CSV order.")
    print("  No character references — prompt-only generation.")
    print("  Already-completed scenes are skipped automatically.")
    print("  Ctrl+C at any time — resume by re-running.")
    print()

    all_prompts = load_prompts()
    if not all_prompts:
        print("  ❌ No prompts found in prompts.csv. Exiting.")
        return

    completed  = load_progress()
    auto       = [p for p in all_prompts if p["manual_review"] != "yes"]
    manual     = [p for p in all_prompts if p["manual_review"] == "yes"]
    remaining  = [p for p in auto if p["scene_number"] not in completed]

    print(f"  📊 Pipeline overview:")
    print(f"     Auto-generate scenes:  {len(auto)}")
    print(f"     Manual review scenes:  {len(manual)}")
    print(f"     Already completed:     {len(auto) - len(remaining)}")
    print(f"     Still to generate:     {len(remaining)}")
    print()

    if AUTO_RUN:
        print("  AUTO_RUN = True — starting in 5 seconds...")
        await asyncio.sleep(5)
    else:
        input("  Press ENTER to begin... ")

    async with async_playwright() as p:
        print("\n  🔌 Connecting to Chrome...")
        try:
            browser = await p.chromium.connect_over_cdp(CHROME_DEBUG_URL)
            print("  ✅ Connected!")
        except Exception as e:
            print("\n  ❌ Could not connect to Chrome.")
            print("  Launch Chrome with remote debugging first.")
            print("  Run this in PowerShell:\n")
            print(r'  Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" `')
            print(r'    -ArgumentList "--remote-debugging-port=9222", `')
            print(r'    "--profile-directory=Default", `')
            print(r'    "--user-data-dir=C:\Users\Family\AppData\Local\Google\Chrome\User Data"')
            return

        async def close_rogue_tabs():
            while True:
                try:
                    for context in browser.contexts:
                        for tab in context.pages:
                            if any(x in tab.url for x in ["crx", "crxlauncher", "chrome-extension"]):
                                log.info(f"[Watchdog] Closing rogue tab: {tab.url}")
                                await tab.close()
                except Exception:
                    pass
                await asyncio.sleep(3)

        watchdog = asyncio.ensure_future(close_rogue_tabs())

        page = None
        for context in browser.contexts:
            for p_page in context.pages:
                if "chatgpt.com" in p_page.url:
                    page = p_page
                    break

        if page:
            print(f"  ✅ Found existing ChatGPT tab.")
        else:
            print("  🌐 Opening ChatGPT tab...")
            context = browser.contexts[0] if browser.contexts else await browser.new_context()
            page    = await context.new_page()
            await page.goto(CHATGPT_URL, wait_until="domcontentloaded")

        await page.bring_to_front()
        page.on("popup", lambda popup: asyncio.ensure_future(popup.close()))
        print("  🛡️  Popup handler active.")
        print("  🛡️  Rogue tab watchdog active.")

        print("\n" + "=" * 55)
        print("  ACTION REQUIRED")
        print("=" * 55)
        print("  1. Make sure you are logged into ChatGPT")
        print("  2. Make sure you are in the correct conversation")
        print("     (or start a NEW chat if this is a fresh video)")
        print("=" * 55)

        if AUTO_RUN:
            print("  AUTO_RUN — continuing in 10 seconds...")
            await asyncio.sleep(10)
        else:
            input("  Press ENTER when ChatGPT is ready... ")

        print()
        print("=" * 55)
        print("  ⚠️  FINAL CHECK BEFORE GENERATION STARTS")
        print("=" * 55)
        print("  Are you ready to start generating images?")
        print("  Ensure you are in the correct conversation.")
        print()
        confirm = input("  Type YES to begin: ").strip().lower()
        if confirm != "yes":
            print()
            print("  ⛔ Generation cancelled. Nothing was sent.")
            print("  Re-run the script when you are ready.")
            print()
            watchdog.cancel()
            return
        print()

        await run_all_scenes(page, all_prompts)

        print("\n" + "=" * 55)
        print("  🎉 GENERATION COMPLETE!")
        print("=" * 55)
        print("\n  👉 Run download_images.py in 2_Image-Downloader.")
        print("=" * 55 + "\n")
        log.info("Pipeline complete.")
        watchdog.cancel()


if __name__ == "__main__":
    asyncio.run(main())
