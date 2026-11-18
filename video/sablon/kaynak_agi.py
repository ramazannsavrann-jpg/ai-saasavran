"""Kaynak ağı sahnesi ("net"): solda yapay zekânın kaynak gösterdiği siteler, sağda markalar/firmalar.
Çizgi kalınlığı = o siteyi kaynak gösterip o markayı anan cevap sayısı. make.py içinden çağrılır.
Ayar: CFG["net"] = {"left": [[site, cevap], ...], "right": [ad, ...], "links": [[sol_i, sag_i, cevap], ...]}
Metin: T["tag_net"], T["net"], T["net_sub"], T["net_note"]. İlk sağ ad (en çok anılan) altın renkte.
"""
def scene(m, t, dur):
    CFG, T = m.CFG, m.T
    im, d = m.base(); m.tag(d, t, T["tag_net"]); y0 = m.title(d, t, T["net"], T.get("net_sub")) + 70
    net = CFG["net"]; L, R, links = net["left"], net["right"], net["links"]
    y1 = m.YB - 150
    ly = [y0 + (y1 - y0) * i / max(len(L) - 1, 1) for i in range(len(L))]
    ry = [y0 + (y1 - y0) * i / max(len(R) - 1, 1) for i in range(len(R))]
    xl, xr = 455, 600; mx = max(w for _, _, w in links) or 1
    for li, ri, w in sorted(links, key=lambda k: k[2]):
        if w <= 0: continue
        a = m.ease((t - 0.6 - li * 0.12) / 0.8) * (0.35 + 0.65 * w / mx)
        col = m.GOLD if ri == 0 else m.ACC
        d.line([(xl, ly[li] + 22), (xr, ry[ri] + 22)], fill=m.mix(col, a), width=max(2, round(14 * w / mx)))
    fs = m.font("Bold", 34)
    for i, (dom, n) in enumerate(L):
        a = m.ease((t - 0.3 - i * 0.1) / 0.5)
        f = m.fit(d, dom, "Bold", 34, xl - 100, 22)
        m.rtext(d, xl - 22, ly[i], dom, f, m.mix(m.INK, a)); d.ellipse([xl - 9, ly[i] + 13, xl + 9, ly[i] + 31], fill=m.mix(m.ACC, a))
    for i, name in enumerate(R):
        a = m.ease((t - 0.3 - i * 0.1) / 0.5)
        f = m.fit(d, name, "Bold", 38, m.XR - xr - 24, 24)
        d.ellipse([xr - 9, ry[i] + 13, xr + 9, ry[i] + 31], fill=m.mix(m.GOLD if i == 0 else m.INK, a))
        d.text((xr + 22, ry[i] + 2), name, font=f, fill=m.mix(m.GOLD if i == 0 else m.INK, a))
    if T.get("net_note"): m.text_block(d, T["net_note"], m.font("SemiBold", 38), y1 + 60, m.ACC, m.ease((t - 2.0) / 0.6))
    return im
