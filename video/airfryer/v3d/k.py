"""Airfryer Short - yeni 3B tasarım, onay kareleri (gerçek veri)."""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np, math

S = 2                      # süper örnekleme
W, H = 1080, 1920
FD = "/usr/share/fonts/opentype/inter/InterDisplay-{}.otf"
FI = "/usr/share/fonts/opentype/inter/Inter-{}.otf"
_fc = {}
def f(w, s, disp=True):
    k = (w, s, disp)
    if k not in _fc:
        _fc[k] = ImageFont.truetype((FD if disp else FI).format(w), int(s * S))
    return _fc[k]

INK = (22, 26, 51)
SUB = (92, 100, 135)
COL = {
    "Philips": (61, 107, 255), "Xiaomi": (255, 122, 26), "Ninja": (24, 170, 120),
    "Karaca": (232, 70, 124), "Tefal": (139, 92, 246), "Arzum": (240, 176, 0),
    "Cosori": (16, 178, 200), "Fakir": (150, 158, 178),
}
RED = (232, 54, 72)

def P(*xy): return [v * S for v in xy]
def shade(c, k): return tuple(max(0, min(255, int(v * k))) for v in c)
def mix(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def background():
    yy = np.linspace(0, 1, H * S)[:, None]
    xx = np.linspace(0, 1, W * S)[None, :]
    top, bot = np.array([248, 246, 255]), np.array([226, 232, 255])
    img = top * (1 - yy[..., None]) + bot * yy[..., None]
    img = np.broadcast_to(img, (H * S, W * S, 3)).copy()
    # yumuşak renk lekeleri
    for cx, cy, r, c, a in [(0.15, 0.18, 0.55, (255, 214, 236), 0.55),
                            (0.92, 0.42, 0.6, (206, 226, 255), 0.6),
                            (0.3, 0.86, 0.6, (230, 220, 255), 0.5)]:
        d = np.sqrt((xx - cx) ** 2 + ((yy - cy) * H / W) ** 2) / r
        m = np.clip(1 - d, 0, 1) ** 2 * a
        img = img * (1 - m[..., None]) + np.array(c) * m[..., None]
    return Image.fromarray(img.astype("uint8"), "RGB")

class Frame:
    def __init__(self):
        self.im = background()
        self.d = ImageDraw.Draw(self.im, "RGBA")
    def shadow(self, box, r=30, blur=26, alpha=70, dy=18):
        lay = Image.new("L", self.im.size, 0)
        ImageDraw.Draw(lay).rounded_rectangle(P(box[0], box[1] + dy, box[2], box[3] + dy), radius=r * S, fill=alpha)
        lay = lay.filter(ImageFilter.GaussianBlur(blur * S))
        self.im.paste(Image.new("RGB", self.im.size, (40, 40, 90)), (0, 0), lay)
        self.d = ImageDraw.Draw(self.im, "RGBA")
    def ellipse_shadow(self, cx, cy, rx, ry, alpha=80, blur=14):
        lay = Image.new("L", self.im.size, 0)
        ImageDraw.Draw(lay).ellipse(P(cx - rx, cy - ry, cx + rx, cy + ry), fill=alpha)
        lay = lay.filter(ImageFilter.GaussianBlur(blur * S))
        self.im.paste(Image.new("RGB", self.im.size, (40, 40, 90)), (0, 0), lay)
        self.d = ImageDraw.Draw(self.im, "RGBA")
    def card(self, box, r=36, fill=(255, 255, 255, 235), sh=True):
        if sh: self.shadow(box, r)
        self.d.rounded_rectangle(P(*box), radius=r * S, fill=fill)
    def text(self, xy, s, font, fill=INK, anchor="la"):
        self.d.text(P(*xy), s, font=font, fill=fill, anchor=anchor)
    def tw(self, s, font): return self.d.textlength(s, font=font) / S
    def pill(self, x, y, s, bg=(22, 26, 51), fg=(255, 255, 255), size=28, pad=24, h=56):
        ft = f("Bold", size)
        w = self.tw(s, ft) + pad * 2
        self.d.rounded_rectangle(P(x, y, x + w, y + h), radius=h / 2 * S, fill=bg)
        self.text((x + pad, y + h / 2), s, ft, fg, "lm")
        return w
    def header(self, tag, title, sub=None, y=200, tagcol=(22, 26, 51)):
        self.pill(80, y, tag, tagcol)
        yy = y + 86
        for line in title.split("\n"):
            self.text((80, yy), line, f("Black", 76)); yy += 86
        if sub:
            self.text((80, yy + 6), sub, f("SemiBold", 32, False), SUB)
        return yy
    def series(self):
        # sağ üst köşe dizi rozeti (güvenli alan içinde)
        s = "KASIM FIRSATLARI"
        ft = f("ExtraBold", 24)
        w = self.tw(s, ft) + 40
        x = 880 - w
        self.d.rounded_rectangle(P(x, 200, 880, 248), radius=24 * S, fill=(255, 255, 255, 230), outline=(22, 26, 51, 40), width=2 * S)
        self.text((x + 20, 224), s, ft, (232, 54, 72), "lm")
    def foot(self, s="22 Kasım 2026 · Türkiye · Yapay zekâ cevapları, tavsiye değildir. Adlar sahiplerine aittir."):
        self.text((80, 1372), s, f("Medium", 20, False), (120, 126, 160))
    def save(self, path):
        self.im.resize((W, H), Image.LANCZOS).save(path, quality=93)

    # ---------- 3B öğeler ----------
    def hbar(self, x, y, length, h, c, depth=22):
        """yatay 3B çubuk: ön yüz + üst yüz + uç yüz"""
        dx, dy = depth, -depth * 0.75
        self.d.polygon([tuple(P(x, y)), tuple(P(x + dx, y + dy)), tuple(P(x + length + dx, y + dy)), tuple(P(x + length, y))], fill=shade(c, 1.28))
        self.d.polygon([tuple(P(x + length, y)), tuple(P(x + length + dx, y + dy)), tuple(P(x + length + dx, y + h + dy)), tuple(P(x + length, y + h))], fill=shade(c, 0.72))
        # ön yüz: dikey gradyan
        top, bot = shade(c, 1.08), shade(c, 0.86)
        for i in range(int(h * S)):
            t = i / (h * S)
            self.d.line([(x * S, y * S + i), ((x + length) * S, y * S + i)], fill=mix(top, bot, t))
        self.d.line([(x * S, y * S + 2), ((x + length) * S, y * S + 2)], fill=(255, 255, 255, 90), width=2 * S)
    def vbar(self, x, base, w, h, c, depth=30):
        dx, dy = depth, -depth * 0.6
        self.d.polygon([tuple(P(x + w, base - h)), tuple(P(x + w + dx, base - h + dy)), tuple(P(x + w + dx, base + dy)), tuple(P(x + w, base))], fill=shade(c, 0.7))
        self.d.polygon([tuple(P(x, base - h)), tuple(P(x + dx, base - h + dy)), tuple(P(x + w + dx, base - h + dy)), tuple(P(x + w, base - h))], fill=shade(c, 1.3))
        for i in range(int(w * S)):
            t = i / (w * S)
            self.d.line([(x * S + i, (base - h) * S), (x * S + i, base * S)], fill=mix(shade(c, 1.1), shade(c, 0.88), t))
    def sphere(self, cx, cy, r, c):
        self.ellipse_shadow(cx + r * 0.12, cy + r * 0.92, r * 0.85, r * 0.2, alpha=90, blur=max(6, r * 0.12))
        R = int(r * S); yy, xx = np.mgrid[-R:R, -R:R]
        dist = np.sqrt(xx ** 2 + yy ** 2) / R
        mask = (dist <= 1).astype(float)
        lx, ly = -0.38, -0.45
        hl = np.sqrt((xx / R - lx) ** 2 + (yy / R - ly) ** 2)
        k = np.clip(1.25 - hl * 0.55, 0.55, 1.3)
        rgb = np.stack([np.clip(c[i] * k + np.clip(0.35 - hl, 0, 1) * 300, 0, 255) for i in range(3)], -1)
        rim = np.clip((dist - 0.86) / 0.14, 0, 1)[..., None]
        rgb = rgb * (1 - rim * 0.25)
        a = (np.clip((1 - dist) * R / 1.5, 0, 1) * 255).astype("uint8")
        sp = Image.fromarray(rgb.astype("uint8"), "RGB"); sp.putalpha(Image.fromarray(a))
        self.im.paste(sp, (int(cx * S) - R, int(cy * S) - R), sp)
        self.d = ImageDraw.Draw(self.im, "RGBA")
