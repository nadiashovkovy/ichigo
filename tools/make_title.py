"""
Makes the title card and the intro's great wave from Hokusai's print (public domain).

    curl -L -o wave.jpg "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Tsunami_by_hokusai_19th_century.jpg/1280px-Tsunami_by_hokusai_19th_century.jpg"
    python tools/make_title.py wave.jpg

Writes assets/title_chart.png: the title screen, a chart of the print like a cross-stitch pattern,
213 cells wide (the game draws each cell as 3×3 pixels): every cell one flat colour from a small
palette, a flat paper sky with the cloud in cream, an ink outline where the waves meet the sky, the
grey haze behind the wave speckled with spray, the boats and Fuji as the print has them. And
assets/great_wave.png: the big wave cut out of a chart of the print (a grid of cells, each one clean
colour from the palette below, with an ink outline where the waves meet the sky; the boats painted
out), 400×288 cells, for the intro to raise out of the sea. The game draws every cell as one pixel.
Needs Pillow, numpy and scipy.
"""
import os, sys
import numpy as np
from PIL import Image, ImageEnhance
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# The palette, matched to a pixelated version of the print: paper sky, cream foam, three blues
# and an ink-dark outline, the greys of the far sea, and the ochre of the boats.
PAL = ['#f4ecd8', '#fdfbf3', '#a8c4cc', '#7fa3bf', '#3f669c', '#1f3270', '#0e1430',
       '#d4d0c4', '#aeaba0', '#8a8a84', '#64666a', '#c9a464', '#dbc8a2']
SKY, CLOUD = '#e6cea5', '#f4ecd8'
rgb = lambda h: [int(h[i:i + 2], 16) for i in (1, 3, 5)]

HORIZON = .735   # where the far sea meets the sky, as a fraction of the chart's height (Fuji's foot is at .748)

def main(src):
    im = Image.open(src).convert('RGB')
    im = im.crop((16, 16, im.width - 16, im.height - 16))   # lose the print's border
    a = np.asarray(im, float)
    h, w = a.shape[:2]
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    lum = (r + g + b) / 3

    # The sky: warm paper, joined to the top edge of the print. The title cartouche and the
    # signature (top left) are painted over with sky first.
    a[int(h * .02):int(h * .30), int(w * .0):int(w * .10)] = np.median(a[int(h * .05):int(h * .12), int(w * .6):int(w * .9)].reshape(-1, 3), 0)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]; lum = (r + g + b) / 3
    paper = (r - b > 18) & (lum > 140) & (r >= g)
    paper = ndimage.binary_opening(paper, iterations=2)
    lab, _ = ndimage.label(paper)
    sky = np.isin(lab, np.unique(lab[:3, :])[1:])
    sky = ndimage.binary_fill_holes(ndimage.binary_closing(sky, iterations=3))
    # the cloud: the paler paper in the sky, smoothed into one soft shape
    soft = ndimage.gaussian_filter(lum, 10)
    cloud = sky & (soft > np.percentile(soft[sky], 84)) & (np.arange(h)[:, None] < h * .36) & (np.arange(w)[None, :] > w * .35)
    cloud = ndimage.binary_opening(cloud, iterations=6)
    title_chart(a, sky, cloud)

    pal = np.array([rgb(p) for p in PAL + [SKY]], float)
    SKY_I, INK_I, GREYS = len(PAL), PAL.index('#0e1430'), [PAL.index(c) for c in ('#d4d0c4', '#aeaba0', '#8a8a84', '#64666a')]
    # The chart, 640 cells wide (a cell to a pixel in the game), for the wave cut-out.
    for width in (640,):
        H = round(width * h / w)
        small = lambda m: np.asarray(Image.fromarray((m * 255).astype(np.uint8)).resize((width, H), Image.Resampling.BOX)) > 127
        sky_s, cloud_s = small(sky), small(cloud)
        sm = Image.fromarray(a.astype(np.uint8)).resize((width, H), Image.Resampling.BOX)
        sm = ImageEnhance.Contrast(sm).enhance(1.3); sm = ImageEnhance.Color(sm).enhance(1.4)
        s = np.asarray(sm, float)
        idx = (((s[:, :, None, :] - pal[None, None, :-1]) ** 2) * [1.0, 1.3, .9]).sum(-1).argmin(-1)
        # greys belong only to the far sea behind Fuji; anywhere else they're foam mixed with blue
        yy, xx = np.mgrid[0:H, 0:width] / [[[H]], [[width]]]
        far = (xx > .38) & (xx < .95) & (yy > .5) & (yy < .8)
        for grey, blue in zip(GREYS, ('#a8c4cc', '#a8c4cc', '#7fa3bf', '#7fa3bf')):
            idx[(idx == grey) & ~far] = PAL.index(blue)
        idx[sky_s] = SKY_I
        # the haze above the far sea is sky: the grey stops at the horizon, so it isn't a grey box
        # round Fuji (the wave's edge gets its ink outline against it, below)
        haze = far & (yy < HORIZON - .03) & np.isin(idx, GREYS)
        idx[ndimage.binary_opening(haze, iterations=1) | (haze & ndimage.binary_dilation(idx == SKY_I, iterations=3))] = SKY_I   # (not lone grey specks in the foam)
        idx[0] = SKY_I                                     # the top edge is all sky
        idx[:, 0] = idx[:, 1]; idx[:, -1] = idx[:, -2]     # no leftover border down the sides
        idx = tidy(idx, len(pal))
        # the ink outline: foam and water cells that touch the sky, as in the chart
        sky_now = idx == SKY_I
        touch = np.zeros_like(sky_now)
        touch[1:] |= sky_now[:-1]; touch[:-1] |= sky_now[1:]; touch[:, 1:] |= sky_now[:, :-1]; touch[:, :-1] |= sky_now[:, 1:]
        idx[touch & ~sky_now & ~np.isin(idx, GREYS)] = INK_I
        # the far sea on the horizon: calm, clean bands of grey (no speckle to pull the eye)
        frayed = np.random.default_rng(7).random(idx.shape) < np.clip(np.minimum((xx - .38) / .07, (.95 - xx) / .05), 0, 1)   # the strip's ends fray out
        band = far & frayed & (np.isin(idx, GREYS) | ((idx == PAL.index('#fdfbf3')) & (xx > .47) & (xx < .88))) & (yy >= HORIZON - .03) & (yy < .755)   # (whites only out in the open, not the wave's foam)
        idx[band] = np.where(yy < HORIZON - .01, GREYS[1], np.where(yy < HORIZON + .01, GREYS[2], GREYS[3]))[band]
        # the boats are painted out of the picture, which takes the colours of the water around them
        hole = np.zeros((H, width), bool)
        yy2, xx2 = np.mgrid[0:H, 0:width]
        for bname, spec in BOATS.items():
            layer = draw_boat(width, H, s=width // 160, **spec)
            shape = layer[..., 3] > 0
            ys, xs = np.nonzero(shape)
            box = (yy2 >= ys.min() - 1) & (yy2 <= ys.max() + 1) & (xx2 >= xs.min() - 1) & (xx2 <= xs.max() + 1)
            smear = box & ndimage.binary_dilation(shape, iterations=2) & np.isin(idx, [PAL.index('#c9a464'), PAL.index('#dbc8a2')])
            hole |= ndimage.binary_dilation(shape, iterations=1) | smear
        _, (iy, ix) = ndimage.distance_transform_edt(hole, return_indices=True)
        idx = idx[iy, ix]
        draw_fuji(idx, width, H)
        out = pal[idx].astype(np.uint8)
        # the great wave on its own (sky and cloud see-through), for the intro to raise out of the sea
        wave = np.zeros((288, 400, 4), np.uint8)
        keep = ~sky_now[:288, :400] & ~cloud_s[:288, :400] & ~np.isin(idx[:288, :400], GREYS)
        wave[keep] = np.concatenate([out[:288, :400][keep], np.full((keep.sum(), 1), 255, np.uint8)], 1)
        Image.fromarray(wave).save(os.path.join(ROOT, 'assets', 'great_wave.png'))
        print('assets/title_chart.png, assets/great_wave.png')

# The print's three boats, traced from it in fractions of its width and height (so they fit either
# chart): the top and bottom edges of each hull, from bow to stern; where the straw mat lies on the
# rim; and where rowers sit (light = white caps, dark = dark hair).
BOATS = {
    'bottom': dict(rim=[(.406, .783), (.50, .858), (.575, .915), (.738, .939), (.80, .915)],
                   bottom=[(.406, .783), (.49, .887), (.563, .953), (.738, .967), (.80, .915)],
                   mat=(.463, .58), rowers=[.705 + k * .016 for k in range(6)], caps='dark'),
    'fuji': dict(rim=[(.554, .718), (.60, .746), (.65, .76), (.70, .755), (.75, .735), (.80, .705), (.855, .65)],   # (two rows lower than traced, and
                 bottom=[(.554, .718), (.60, .765), (.65, .785), (.70, .785), (.75, .765), (.80, .735), (.855, .68)],  # no mat, so Fuji stands clear above it)
                 mat=None, rowers=[.725, .74, .815, .83, .845], caps='light'),
    'left': dict(rim=[(.012, .479), (.048, .569), (.096, .617), (.16, .648), (.224, .66)],
                 bottom=[(.012, .479), (.03, .53), (.06, .62), (.10, .70), (.16, .712), (.228, .672)],
                 mat=(.09, .2), rowers=[], caps='dark', deck=True),
}

def draw_fuji(idx, width, H, peak=(.632, .642), base=.748, half=.078):
    """Mt Fuji, drawn cell by cell so it stays clear at this size: a white snowy peak, its snow
    line ragged, broad streaks of snow running down the grey lower slopes (the pattern is sized
    for a 160-cell chart and scaled up, so it stays bold at any size), the slopes' edges a darker grey."""
    W_ = PAL.index('#fdfbf3'); B1 = PAL.index('#64666a'); B2 = PAL.index('#8a8a84'); s = max(1, width // 160)
    py, by, cx = peak[1] * H, base * H, peak[0] * width
    for y in range(int(py), int(np.ceil(by))):
        k = (y + .5 - py) / (by - py)                      # 0 at the peak, 1 at the base
        hw = max(.6, k * half * width)
        for x in range(int(cx - hw), int(np.ceil(cx + hw))):
            if not (0 <= x < width and 0 <= y < H): continue
            X = int((x - cx) // s)                         # the column in the 160-cell design
            snow = k < .5 + (.12 if X % 3 == 0 else 0) or (X % 4 == 1 and k < .8 - .1 * ((X * 7) % 3) / 2)
            edge = abs(x + .5 - cx) > hw - s * .8         # a darker rim down each slope
            idx[y, x] = W_ if snow and not edge else (B1 if edge or X % 4 == 3 else B2)

def draw_boat(width, H, rim, bottom, mat, rowers, caps, deck=False, s=2):
    """One boat, drawn cell by cell: a salmon rim over a cream side, the straw mat on top (or, with
    deck, covering the whole hull in planks, as the left boat's is), the rowers hunched along the
    rim, all with an ink outline. s = cells per cell of the original 160-cell chart (sizes are
    designed for that). Returns a transparent layer the size of the chart."""
    X = lambda f: f * width; Y = lambda f: f * H
    lerp = lambda pts, x: np.interp(x, [X(p[0]) for p in pts], [Y(p[1]) for p in pts])
    out = np.zeros((H, width, 4), np.uint8)
    put = lambda x, y, c: out.__setitem__((y, x), rgb(c) + [255]) if 0 <= x < width and 0 <= y < H else None
    x0, x1 = int(np.ceil(X(rim[0][0]))), int(X(rim[-1][0]))
    for x in range(x0, x1 + 1):
        top, bot = int(round(lerp(rim, x + .5))), int(round(lerp(bottom, x + .5)))
        for y in range(top, max(top, bot) + 1):
            put(x, y, '#c9a464' if y < top + s or bot - top < 2 * s else '#dbc8a2')   # salmon rim, cream side
            if deck and X(mat[0]) <= x < X(mat[1]) and top < y < bot:   # planks, tied across every few cells
                put(x, y, '#c9a464' if x % (6 * s) == 0 or (y - top) % (2 * s) >= s else '#dbc8a2')
    for x in (range(int(X(mat[0])), int(X(mat[1]))) if mat and not deck else []):   # the straw mat, lying on the rim, tied in bundles
        top = int(round(lerp(rim, x + .5)))
        for dy in range(1, s + 1): put(x, top - dy, '#0e1430' if x % (3 * s) == 0 else '#c9a464')   # bundles tied with ink
        for dy in range(s + 1, 2 * s + 1): put(x, top - dy, '#0e1430' if x % (3 * s) == 0 and dy == s + 1 else '#dbc8a2')
    for f in rowers:   # the rowers: hunched backs (lit on one side), a round head on top
        x = int(X(f)); top = int(round(lerp(rim, x + .5)))
        for dy in range(1, 2 * s + 1):
            for dx in range(2 * s): put(x + dx, top - dy, '#3f669c' if dx < s else '#1f3270')
        hy = top - 2 * s
        for dy in range(1, s + 1):
            for dx in range(2 * s):
                if dy == s and dx in (0, 2 * s - 1): continue   # round the top of the head off
                light = (dx < s) if dy == s else dx == 0
                put(x + dx, hy - dy, ('#fdfbf3' if light else '#f4ecd8') if caps == 'light' else ('#f4ecd8' if dx == 2 * s - 1 and dy < s else '#0e1430'))
    a = out[..., 3] > 0   # the ink outline all round
    ring = ndimage.binary_dilation(a, structure=np.ones((3, 3))) & ~a
    out[ring] = rgb('#0e1430') + [255]
    return out

# The title chart's palette, after a cross-stitch chart of the print: white and cream foam, a
# grey-green pale blue, slate, royal blue, navy and ink; the greys of the haze; the boats' ochres.
TITLE_PAL = ['#fcfdf9', '#f2ebda', '#a9c3c4', '#7fa1ab', '#516d85', '#2b4a8a', '#0b123f', '#03040c',
             '#d2cabd', '#aea89b', '#938e81', '#6c6c66', '#3a3a35', '#c4af72', '#90845b', '#dbc8a2']
TITLE_SKY, TITLE_CLOUD = '#dac4a0', '#f2ebda'

def title_chart(a, sky, cloud, width=213):
    """The title screen's chart (see the top of this file). a: the print (border trimmed); sky, cloud:
    its paper sky and its cloud, as masks."""
    h, w = a.shape[:2]; H = round(width * h / w)
    small = lambda m: np.asarray(Image.fromarray((m * 255).astype(np.uint8)).resize((width, H), Image.Resampling.BOX)) > 127
    sky_s, cloud_s = small(sky), small(cloud)
    sm = Image.fromarray(a.astype(np.uint8)).resize((width, H), Image.Resampling.BOX)
    sm = ImageEnhance.Contrast(sm).enhance(1.25); sm = ImageEnhance.Color(sm).enhance(1.3)
    s = np.asarray(sm, float)
    pal = np.array([rgb(p) for p in TITLE_PAL + [TITLE_SKY]], float)
    SKY_I, CLOUD_I, INK_I = len(TITLE_PAL), TITLE_PAL.index(TITLE_CLOUD), TITLE_PAL.index('#03040c')
    GREYS = [TITLE_PAL.index(c) for c in ('#d2cabd', '#aea89b', '#938e81', '#6c6c66', '#3a3a35')]
    idx = (((s[:, :, None, :] - pal[None, None, :-1]) ** 2) * [1.0, 1.3, .9]).sum(-1).argmin(-1)
    # greys belong to the haze behind the wave and the far sea; anywhere else they're foam mixed with blue
    yy, xx = np.mgrid[0:H, 0:width] / [[[H]], [[width]]]
    haze = (xx > .36) & (yy > .28) & (yy < .8)
    for grey, blue in zip(GREYS, ('#a9c3c4', '#a9c3c4', '#7fa1ab', '#516d85', '#0b123f')):
        idx[(idx == grey) & ~haze] = TITLE_PAL.index(blue)
    idx[sky_s] = SKY_I
    idx[0] = SKY_I                                     # the top edge is all sky
    idx[:, 0] = idx[:, 1]; idx[:, -1] = idx[:, -2]     # no leftover border down the sides
    idx = tidy(idx, len(pal), passes=1)
    sky_now = idx == SKY_I
    idx[cloud_s & sky_now] = CLOUD_I                   # the cloud, cream on the paper sky
    # the haze in the hollow under the crest: grey, darkening toward the horizon, its top edge ragged,
    # speckled with white spray (thicker near the wave)
    rng = np.random.default_rng(3)
    top = np.round(H * (.345 + .012 * np.sin(np.arange(width) * .45)) + rng.integers(-1, 2, width)).astype(int)
    hz = sky_now & (xx > .36) & (yy * H >= top[None, :]) & (yy < HORIZON - .005)
    v = np.clip((yy * H - top[None, :]) / (H * (HORIZON - .345)), 0, 1) + ((np.arange(width)[None, :] + np.arange(H)[:, None]) % 2) * .06
    shades = np.array([TITLE_PAL.index(c) for c in ('#d2cabd', '#aea89b', '#938e81', '#6c6c66')])
    idx[hz] = shades[np.minimum(3, (v * 3.6).astype(int))][hz]
    spray = hz & (rng.random(idx.shape) < .05 + .1 * np.clip((.62 - xx) / .25, 0, 1))
    idx[spray] = TITLE_PAL.index('#fcfdf9')
    sky_now = idx == SKY_I
    touch = np.zeros_like(sky_now)                     # the ink outline: wave cells that touch the sky
    touch[1:] |= sky_now[:-1]; touch[:-1] |= sky_now[1:]; touch[:, 1:] |= sky_now[:, :-1]; touch[:, :-1] |= sky_now[:, 1:]
    idx[touch & ~sky_now & ~hz & ~np.isin(idx, GREYS + [CLOUD_I])] = INK_I   # (not the haze or its spray)
    Image.fromarray(pal[idx].astype(np.uint8)).save(os.path.join(ROOT, 'assets', 'title_chart.png'))

def tidy(idx, n, passes=2):
    """Clean up the chart: a cell that matches almost none of its 8 neighbours, when most of them
    agree, takes their colour. Removes the specks that make a shrunk picture look noisy."""
    for _ in range(passes):
        p = np.pad(idx, 1, mode='edge')
        nb = np.stack([p[1 + dy:p.shape[0] - 1 + dy, 1 + dx:p.shape[1] - 1 + dx] for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx])
        counts = np.stack([(nb == c).sum(0) for c in range(n)])
        best, best_n = counts.argmax(0), counts.max(0)
        same = np.take_along_axis(counts, idx[None], 0)[0]
        idx = np.where((same <= 1) & (best_n >= 5), best, idx)
    return idx

if __name__ == '__main__':
    main(sys.argv[1])
