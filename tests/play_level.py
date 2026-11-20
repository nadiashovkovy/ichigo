"""
Automated play-test for Ichigo.

What it does:
  1. Serves the game from this folder on a local web server.
  2. Opens it in a headless Chrome and takes a screenshot of every scene (tests/screens/).
  3. Lets a simple "bot" play Level 1: it walks, runs before wide gaps, jumps near the end
     of each piece of wreckage, and keeps its balance while waiting for drifting planks.
  4. Reports any page errors, where the bot fell in, and whether it reached the lantern.

Run it from the project folder:
    pip install playwright && playwright install chromium
    python tests/play_level.py
"""
import asyncio, functools, http.server, os, sys, threading
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS = os.path.join(ROOT, 'tests', 'screens')
PORT = 8765
CHROME = os.environ.get('CHROME_PATH')   # optional: use a specific Chrome

BOT = r'''
(() => { const { S, PL, input, keys } = window.ichigo; let hold = 0, from = null;
  window._fallen = []; let lastDeaths = 0;
  window._bot = setInterval(() => {
    if (S.deaths > lastDeaths) { window._fallen.push(Math.round(PL.x)); lastDeaths = S.deaths; }
    if (S.scene !== 'play') { keys.Space = false; from = null; return; }
    const g = PL.ground;
    if (hold > 0 && !--hold) keys.Space = false;
    if (!g) { keys.ArrowRight = true; keys.ArrowLeft = false; return; }
    const i = S.plats.indexOf(g), nx = S.plats[i + 1];
    const gap = nx ? (nx.cx - nx.w / 2) - (g.cx + g.w / 2) : 0;
    keys.ShiftLeft = gap > 125;
    if (gap >= 190 && g.type !== 'rock') {     // too far: wait for it, staying balanced near the middle
      keys.ArrowRight = PL.u < -12; keys.ArrowLeft = PL.u > 12; keys.ShiftLeft = false; return;
    }
    keys.ArrowLeft = false; keys.ArrowRight = true;
    if (g !== from && g.type !== 'rock' && PL.u > g.w / 2 - (keys.ShiftLeft ? 24 : 16)) { input.jumpBuffer = 0.14; keys.Space = true; hold = 14; from = g; }
  }, 16);
})();
'''

def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    handler = functools.partial(Quiet, directory=ROOT)
    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd

async def main():
    os.makedirs(SHOTS, exist_ok=True)
    httpd = serve()
    ok = True
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=CHROME, args=['--no-sandbox']) if CHROME else await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 960, 'height': 540})
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        # Only real code errors count. (Failed downloads, e.g. the Google font when offline, don't.)
        await page.goto(f'http://127.0.0.1:{PORT}/index.html')
        await page.wait_for_timeout(2500)
        await page.screenshot(path=f'{SHOTS}/1-title.png')
        await page.keyboard.press('Enter'); await page.wait_for_timeout(3600)
        await page.screenshot(path=f'{SHOTS}/2-intro.png')
        await page.evaluate('ichigo.startLevel()'); await page.wait_for_timeout(1500)
        await page.screenshot(path=f'{SHOTS}/3-play.png')

        await page.add_script_tag(content=BOT)
        result = None
        for second in range(180):
            await page.wait_for_timeout(1000)
            st = await page.evaluate('({x: Math.round(ichigo.PL.x), scene: ichigo.S.scene, deaths: ichigo.S.deaths})')
            if second == 20: await page.screenshot(path=f'{SHOTS}/4-midlevel.png')
            if st['scene'] == 'end':
                result = st; break
        await page.wait_for_timeout(3000)
        await page.screenshot(path=f'{SHOTS}/5-end.png')
        fallen = await page.evaluate('window._fallen')
        await browser.close()
    httpd.shutdown()

    print('Page errors:', errors or 'none')
    print('Bot fell in at x =', fallen or 'never')
    if result:
        print(f"Bot reached the lantern with {result['deaths']} tomorrows.")
    else:
        print('Bot did NOT reach the lantern within 3 minutes.'); ok = False
    if errors: ok = False
    print('Screenshots saved in tests/screens/')
    sys.exit(0 if ok else 1)

asyncio.run(main())
