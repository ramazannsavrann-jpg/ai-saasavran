"""Hastane + saç ekimi videolarının ayar dosyalarını ve anlatımlarını üretir (gerçek ölçüm verisi, 14.11.2026)."""
import json, random

ENG = ["ChatGPT", "Claude", "Gemini"]
# marka: (ChatGPT, Claude, Gemini) önerildiği cevap sayısı, ilk sıra sayısı
DATA = {
 "hastane-tr": dict(lang="tr", kind="hastane",
  rec={"Acıbadem": (9, 13, 14, 11), "Memorial": (8, 9, 14, 3), "Medical Park": (3, 11, 11, 11), "Liv Hospital": (0, 7, 9, 1),
       "Medipol": (4, 8, 4, 3), "Medicana": (0, 4, 10, 1), "Florence Nightingale": (3, 5, 5, 0)},
  qs=[("Antalya'da hangi özel hastane?", [("Memorial", 5), ("Medical Park", 5), ("Acıbadem", 0)]),
      ("Kalp ameliyatı için en iyisi?", [("Acıbadem", 5), ("Florence Nightingale", 5), ("Medical Park", 0)]),
      ("Fiyat performans açısından?", [("Medical Park", 6), ("Acıbadem", 4), ("Florence Nightingale", 0)])],
  src=[("saglikaktuel.com", 4), ("my1health.com", 3), ("tamliste.tr", 3), ("yenisafak.com", 3)], live=32,
  gpt_none=4),
 "hastane-en": dict(lang="en", kind="hastane",
  rec={"Acıbadem": (11, 9, 14, 13), "Memorial": (5, 13, 16, 7), "Medical Park": (0, 6, 14, 3), "Medipol": (1, 7, 6, 2),
       "Florence Nightingale": (1, 3, 6, 0), "Liv Hospital": (0, 6, 1, 0), "Medicana": (0, 2, 3, 0)},
  qs=[("Best hospital in Antalya for tourists?", [("Memorial", 4), ("Medical Park", 4), ("Acıbadem", 0)]),
      ("Best Turkish hospital for IVF?", [("Memorial", 5), ("Acıbadem", 4), ("Medical Park", 0)]),
      ("Best value for money?", [("Memorial", 4), ("Medical Park", 3), ("Medipol", 0)])],
  src=[("my1health.com", 10), ("bookimed.com", 8), ("wikipedia.org", 6), ("ofmhospital.com", 4), ("lifelineturkey.com", 3)], live=32,
  gpt_mention_norec=("Medical Park", 8)),
 "sac-tr": dict(lang="tr", kind="sac",
  rec={"Asmed": (2, 4, 15, 2), "Cosmedica": (1, 7, 7, 0), "Dr. Serkan Aygın": (0, 7, 6, 2), "Smile Hair Clinic": (1, 6, 4, 0),
       "Clinicana": (0, 6, 0, 0), "Vera Clinic": (0, 2, 3, 0), "Estenove": (0, 0, 0, 0)},
  qs=[("DHI saç ekimi için en iyisi?", [("Cosmedica", 5), ("Dr. Serkan Aygın", 3), ("Asmed", 2)]),
      ("Sık ve doğal görünümlü ekim?", [("Asmed", 4), ("Dr. Serkan Aygın", 2), ("Smile Hair Clinic", 0)]),
      ("Uygun fiyatlı ama güvenilir?", [("Vera Clinic", 1), ("Asmed", 1), ("Cosmedica", 0)])],
  src=[("medikalakademi.com.tr", 12), ("ishrs.org", 7), ("saglik.gov.tr", 7), ("konhaber.com", 7), ("antalyaism.saglik.gov.tr", 5)], live=32,
  gpt_none=13),
 "sac-en": dict(lang="en", kind="sac",
  rec={"Asmed": (3, 4, 16, 7), "Smile Hair Clinic": (0, 6, 8, 0), "Cosmedica": (0, 2, 10, 0), "Dr. Serkan Aygın": (0, 4, 5, 3),
       "Vera Clinic": (0, 5, 2, 0), "Estenove": (0, 0, 1, 0), "Clinicana": (0, 0, 0, 0)},
  qs=[("Best DHI clinic in Turkey?", [("Dr. Serkan Aygın", 4), ("Asmed", 2), ("Clinicana", 0)]),
      ("Best clinic in Istanbul?", [("Vera Clinic", 4), ("Smile Hair Clinic", 4), ("Asmed", 3)]),
      ("Most trusted clinic in Turkey?", [("Smile Hair Clinic", 3), ("Asmed", 2), ("Vera Clinic", 0)])],
  src=[("ishrs.org", 11), ("barchart.com", 10), ("jpost.com", 7), ("turkhairindex.com", 7), ("istanbul-care.com", 6)], live=32,
  gpt_none=13),
}
N2 = 48
TR_NUM = {0: "sıfır", 1: "bir", 2: "iki", 3: "üç", 4: "dört", 5: "beş", 6: "altı", 7: "yedi", 8: "sekiz", 9: "dokuz", 10: "on", 11: "on bir",
          12: "on iki", 13: "on üç", 14: "on dört", 15: "on beş", 16: "on altı", 21: "yirmi bir", 23: "yirmi üç", 25: "yirmi beş",
          31: "otuz bir", 34: "otuz dört", 36: "otuz altı", 48: "kırk sekiz", 20: "yirmi", 14.5: ""}
EN_NUM = {0: "zero", 1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven", 8: "eight", 9: "nine", 10: "ten", 11: "eleven",
          12: "twelve", 13: "thirteen", 14: "fourteen", 15: "fifteen", 16: "sixteen", 20: "twenty", 21: "twenty-one", 23: "twenty-three",
          34: "thirty-four", 48: "forty-eight"}


def build(key, d, seed):
    tr = d["lang"] == "tr"; hosp = d["kind"] == "hastane"
    names = sorted(d["rec"], key=lambda s: s.replace("Ç", "C").lower())
    letters = list("ABCDEFG"); random.Random(seed).shuffle(letters)
    L = {n: ("Marka " if tr else "Brand ") + letters[i] for i, n in enumerate(names)}
    if hosp: L = {n: ("Hastane " if tr else "Hospital ") + v.split()[-1] for n, v in L.items()}
    else: L = {n: ("Klinik " if tr else "Clinic ") + v.split()[-1] for n, v in L.items()}
    tot = {n: sum(v[:3]) for n, v in d["rec"].items()}
    order = sorted(d["rec"], key=lambda n: -tot[n])
    first = sorted(d["rec"], key=lambda n: -d["rec"][n][3])
    brands = [[L[n], tot[n]] for n in order]
    eng_rows = [[L[n], *d["rec"][n][:3]] for n in order]
    # en büyük motor farkı
    gap = max(order, key=lambda n: d["rec"][n][2] - d["rec"][n][0])
    g = d["rec"][gap]
    qs = [[q, [[L[n], f"{k}/6", k <= 1 or (i == len(p) - 1 and k < p[0][1] - 1)] for i, (n, k) in enumerate(p)]] for q, p in d["qs"]]
    a, b = order[0], order[1]
    zero = [n for n in order if tot[n] == 0]
    if tr:
        what = "özel hastaneyi" if hosp else "saç ekim kliniğini"
        noun = "hastane" if hosp else "klinik"
        hook = f"Yapay zekâ hangi {what} öneriyor?"
        hook2 = ("Özel hastaneler" if hosp else "Saç ekimi") + f" · 7 {noun} · 8 soru"
        boxes = [{"title": f"İlk sırada önerilen ({N2} cevap)", "lines": [[f"{L[first[0]]}: {d['rec'][first[0]][3]} kez", "gold"],
                                                               [f"{L[first[1]]}: {d['rec'][first[1]][3]} · {L[first[2]]}: {d['rec'][first[2]][3]}", None]]}]
        if d.get("gpt_none"):
            boxes.append({"title": "ChatGPT'nin tavrı", "lines": [[f"16 cevabın {d['gpt_none']}'{'ünde' if d['gpt_none'] in (3,4,13) else 'inde'} hiçbir {noun} önermedi", "bad"],
                                                                 ["“Tek bir en iyi yok” dedi", None]]})
        if zero:
            boxes.append({"title": "Hiç önerilmeyen", "lines": [[f"{L[zero[0]]}: {N2} cevabın hiçbirinde", "bad"]]})
        t = {"hook": hook, "badge": "Aynı mı söylüyorlar?", "hook2": hook2, "note": "Bunlar yapay zekânın cevaplarıdır. Tıbbi tavsiye değildir.",
             "tag_brands": "Önerilme sayısı", "who": "Kim önerildi?", "who_sub": f"3 motor, {N2} cevabın kaçında",
             "tag_eng": "Motor karşılaştırması", "eng": "Motorlar aynı düşünmüyor", "eng_sub": "Önerildiği cevap sayısı",
             "eng_note": f"{L[gap]}: Gemini {g[2]}, ChatGPT {g[0]}.", "tag_q": "Soru bazında", "byq": "Soru değişince lider değişiyor",
             "byq_sub": "Önerildiği cevap / toplam cevap", "tag_box": "İlk sıra", "box": "Kim birinci, kim yok?", "tag_src": "Kaynaklar",
             "src": "Yapay zekâ nereye baktı?", "src_sub": f"Siteyi kaynak gösteren cevap ({d['live']} canlı aramalı cevap{', ' + noun + ' siteleri hariç' if hosp else ''})",
             "src_note": "Sağlık portalları, haber siteleri ve listeler." if hosp else "Bakanlık kayıtları, meslek dernekleri ve haber siteleri.",
             "cta": f"Yapay zekâ sizin {'hastaneniz' if hosp else 'kliniğiniz'} için ne diyor?", "cta2": "ChatGPT, Gemini ve Claude'da ölçün.",
             "free": "Üye olmadan ücretsiz kontrol",
             "disc": "Yapay zekâ motorlarının 14 Kasım 2026 tarihli cevapları. Tıbbi tavsiye değildir. Küçük örneklem, tüm pazarı temsil etmez. Harfler rastgele atanmıştır."}
        cfg_names = ("Ölçülen hastaneler: " if hosp else "Ölçülen klinikler: ") + ", ".join(names)
        footer = "ChatGPT + Claude canlı arama, Gemini aramasız · 14.11.2026"
        n = TR_NUM
        q0, q1 = d["qs"][0], d["qs"][1]
        narr = [f"Yapay zekâ hangi {what} öneriyor?",
                f"Yedi {noun}yi ChatGPT, Claude ve Gemini'ye sekiz farklı soruyla sorduk.",
                f"Kırk sekiz cevapta birinci {L[a]}, {n[tot[a]]} kez önerildi.",
                f"{L[b]} {n[tot[b]]} kez.",
                f"Motorlar aynı düşünmüyor: Gemini, {L[gap]}'yi on altı cevabın {n[g[2]]}{'sinde' if g[2] in (14,) else 'ünde' if g[2] in (13,15,3,4) else 'inde'} önerdi, ChatGPT ise {n[g[0]] + ' kez' if g[0] else 'hiç önermedi'}.".replace(" ise hiç önermedi kez", " ise hiç"),
                f"Soru değişince lider de değişiyor: {q0[0].rstrip('?').lower()} sorusunda {L[q0[1][0][0]]} öne geçti, {L[q0[1][-1][0]]} ise {'hiç önerilmedi' if q0[1][-1][1]==0 else 'geride kaldı'}."]
        if d.get("gpt_none"):
            narr.append(f"İlginç olan: ChatGPT on altı cevabın {n[d['gpt_none']]}{'ünde' if d['gpt_none'] in (3,4,13) else 'inde'} hiçbir {noun} önermedi, tek bir en iyi yok dedi.")
        if zero:
            narr.append(f"{L[zero[0]]} ise kırk sekiz cevabın hiçbirinde önerilmedi.")
        narr += ["Bunlar yapay zekânın cevaplarıdır, tıbbi tavsiye değildir.",
                 f"{'Hastaneniz' if hosp else 'Kliniğiniz'} için ne diyor? Ey Ay Saa, Savran nokta com'da ücretsiz kontrol edin."]
    else:
        what = "private hospital in Turkey" if hosp else "hair transplant clinic in Turkey"
        noun = "hospital" if hosp else "clinic"
        hook = f"Which {what} does AI recommend?"
        hook2 = ("Private hospitals" if hosp else "Hair transplant") + f" · 7 {noun}s · 8 questions"
        boxes = [{"title": f"Ranked first ({N2} answers)", "lines": [[f"{L[first[0]]}: {d['rec'][first[0]][3]} times", "gold"],
                                                               [f"{L[first[1]]}: {d['rec'][first[1]][3]} · {L[first[2]]}: {d['rec'][first[2]][3]}", None]]}]
        if d.get("gpt_none"):
            boxes.append({"title": "ChatGPT's stance", "lines": [[f"No clinic recommended in {d['gpt_none']} of 16", "bad"], ["“There's no single best”", None]]})
        if d.get("gpt_mention_norec"):
            m, k = d["gpt_mention_norec"]
            boxes.append({"title": "Mentioned, not recommended", "lines": [[f"ChatGPT named {L[m]} {k} times", None], ["Recommended it: 0 times", "bad"]]})
        if zero:
            boxes.append({"title": "Never recommended", "lines": [[f"{L[zero[0]]}: 0 of {N2} answers", "bad"]]})
        t = {"hook": hook, "badge": "Do they agree?", "hook2": hook2, "note": "These are the AI's answers. Not medical advice.",
             "tag_brands": "Recommendations", "who": "Who got recommended?", "who_sub": f"3 engines, out of {N2} answers",
             "tag_eng": "Engine comparison", "eng": "The engines disagree", "eng_sub": f"Answers recommending each {noun}",
             "eng_note": f"{L[gap]}: Gemini {g[2]}, ChatGPT {g[0]}.", "tag_q": "By question", "byq": "The winner changes by question",
             "byq_sub": "Answers recommending / total answers", "tag_box": "First place", "box": "Who's first, who's missing?", "tag_src": "Sources",
             "src": "Where did AI look?", "src_sub": f"Answers citing each site ({d['live']} live-search answers{', hospital sites excluded' if hosp else ''})",
             "src_note": "Medical-tourism portals and Wikipedia." if hosp else "A surgeons' society, press-release and news sites.",
             "cta": f"What does AI say about your {noun}?", "cta2": "Measure it in ChatGPT, Gemini and Claude.", "free": "Free check, no sign-up",
             "disc": "AI engine answers from 14 November 2026. Not medical advice. Small sample, not the whole market. Letters assigned at random."}
        cfg_names = ("Hospitals measured: " if hosp else "Clinics measured: ") + ", ".join(names)
        footer = "ChatGPT + Claude live web search, Gemini no search · 14 Nov 2026"
        n = EN_NUM
        q0 = d["qs"][0]
        narr = [f"Which {what} does AI recommend?",
                f"We asked ChatGPT, Claude and Gemini eight questions about seven {noun}s.",
                f"Across forty-eight answers, {L[a]} came first, recommended {n[tot[a]]} times." if tot[a] != tot[b] else
                f"Across forty-eight answers, {L[a]} and {L[b]} tied for first, recommended {n[tot[a]]} times each.",
                (f"{L[b]} got {n[tot[b]]}." if tot[a] != tot[b] else f"{L[order[2]]} got {n[tot[order[2]]]}."),
                f"The engines disagree: Gemini recommended {L[gap]} {n[g[2]]} times, ChatGPT {('only ' + n[g[0]]) if g[0] else 'not once'}.",
                f"The winner changes by question: for {q0[0].rstrip('?').lower().replace('best ', 'the best ', 1)}, {L[q0[1][0][0]]} led, while {L[q0[1][-1][0]]} {'was never recommended' if q0[1][-1][1]==0 else 'fell behind'}."]
        if d.get("gpt_none"):
            narr.append(f"The twist: ChatGPT recommended none of these clinics in {n[d['gpt_none']]} of sixteen answers, saying there is no single best.")
        if d.get("gpt_mention_norec"):
            m, k = d["gpt_mention_norec"]
            narr.append(f"ChatGPT named {L[m]} {n[k]} times, but never recommended it.")
        if zero:
            narr.append(f"{L[zero[0]]} was not recommended in any answer.")
        narr += ["These are the AI's answers, not medical advice.", f"What does AI say about your {noun}? Check it free at A I Saa Savran dot com."]
    narr[0] = (("Özel hastaneler. " if hosp else "Saç ekimi. ") if tr else "") + narr[0]
    cfg = {"out": key, "n2": N2, "order": ["s1", "s2", "s3", "s4", "boxes", "s7", "s8"], "dur": {f"p{i}": 5 for i in range(1, 8)},
           "names": cfg_names, "footer": footer, "brands": brands, "engines": [[e, "/16"] for e in ENG], "eng_rows": eng_rows,
           "eng_hl": [L[gap]] + [L[z] for z in zero[:1]], "questions": qs, "boxes": boxes[:2],
           "sources": [list(s) for s in d["src"]], "t": t, "_map": L}
    return cfg, " ".join(narr)


if __name__ == "__main__":
    for i, (k, d) in enumerate(DATA.items()):
        cfg, narr = build(k, d, 1114 + i * 7)
        json.dump(cfg, open(f"{k}.json", "w"), ensure_ascii=False, indent=1)
        open(f"narration-{k}.txt", "w").write(narr)
        print(k, len(narr.split()), "kelime\n ", narr, "\n ", cfg["_map"])
