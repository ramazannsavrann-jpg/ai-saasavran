# Eğitim 4-8 ayar dosyalarını üretir (ekran konumları shots/<dil>/ofset.json'dan, başlıklara göre).
import json
T = {"tr": dict(series="Nasıl kullanılır · Eğitim {n}", sample="Örnek veri", next="Sonraki eğitim", b="Eğitim {n}"),
     "en": dict(series="How to use · Tutorial {n}", sample="Sample data", next="Next tutorial", b="Tutorial {n}")}
def anchor(l, page, keys, d=0, nth=0):
    o = json.load(open(f"shots/{l}/ofset.json"))[page]
    hits = [y for t, x, y in o if any(x.startswith(k) for k in keys)]
    return max(0, hits[nth] + d - 80)
H = dict(score=("AI Görünürlük Skoru", "AI Visibility Score"), zaman=("Zaman içinde", "Over time"), rakip=("Rakiplerle karşılaştırma", "Competitor comparison"),
         motor=("Motor karşılaştırması", "Engine comparison"), kosul=("Hangi koşulda", "Where you show up"), kaynak=("Yapay zekânın kaynak gösterdiği", "Sites the AI cited"),
         kendi=("Kendi site payı", "Owned-source share"), kimi=("Kaynaklar kimi", "Who the sources support"), firsat=("Kaynak fırsatları", "Source opportunities"),
         soru=("Soru bazında sonuç", "Results by question"), kayip=("Kayıp nedeni", "Why you lost"), gizle=("Cevabı gizle", "Hide answer"),
         rehber=("İyileştirme rehberi", "Improvement guide"), yaptik=("Yaptıklarım", "What I did"), site=("Web sitesi kontrolü", "Website check"))
def A(l, page, key, d=0, nth=0): return anchor(l, page, H[key], d, nth)
V = {
 4: dict(t=("İlk ölçümü başlatmak", "Run the first measurement"), nxt=("Raporu okumak", "Read the report"),
         end=(("Ölçüm başladı", "Her hafta otomatik olarak tekrar ölçülür."), ("Measuring", "It runs again automatically every week.")),
         sc=lambda l, S: [(("Adım 1", "Step 1"), ("İki ölçüm düğmesi", "Two measurement buttons"), [S + "r_rapor.jpg"], [250]),
                          (("Aramasız", "No search"), ("Modelin bildiği", "What the model knows"), [S + "r_rapor_aramasiz_tam.jpg"], [A(l, "rapor_aramasiz", "score")]),
                          (("Canlı arama", "Live search"), ("İnternette arayarak cevap", "Answers after searching the web"), [S + "r_rapor_tam.jpg"], [A(l, "rapor", "score", 1050)]),
                          (("Adım 2", "Step 2"), ("Ölçümler sekmesinde izleyin", "Follow it in the runs tab"), [S + "r_olcumler_tam.jpg"], [1250]),
                          (("Sonuç", "Result"), ("Rapor dolar, skor çıkar", "The report fills in"), [S + "r_rapor_tam.jpg"], [A(l, "rapor", "score")]),
                          (("Her hafta", "Weekly"), ("Değişimi zaman içinde görün", "See change over time"), [S + "r_rapor_tam.jpg"], [A(l, "rapor", "zaman")])],
         g="0|1|2|3|4,5|6|7|8"),
 5: dict(t=("Raporu okumak", "Read the report"), nxt=("Kayıp nedenleri", "Why you lost"),
         end=(("Raporunuzu okudunuz", "Şimdi kaybettiğiniz sorulara bakalım."), ("You've read the report", "Now let's look at the questions you lost.")),
         sc=lambda l, S: [(("Skor", "Score"), ("Yapay zekâ görünürlük skoru", "AI visibility score"), [S + "r_rapor_tam.jpg"], [A(l, "rapor", "score")]),
                          (("Özet", "Summary"), ("Önerilme, anılma, pay", "Recommended, mentioned, share"), [S + "r_rapor_tam.jpg"], [A(l, "rapor", "score", 1050)]),
                          (("Uyarı", "Warning"), ("Örneklem küçükse uyarır", "Small sample warning"), [S + "r_rapor_tam.jpg"], [A(l, "rapor", "score", 1650)]),
                          (("Zaman", "Trend"), ("Haftadan haftaya değişim", "Week by week"), [S + "r_rapor_tam.jpg"], [A(l, "rapor", "zaman")]),
                          (("Rakipler", "Competitors"), ("Kim daha çok öneriliyor?", "Who gets recommended more?"), [S + "r_rapor_tam.jpg"], [A(l, "rapor", "rakip")]),
                          (("Motorlar", "Engines"), ("Her yapay zekâ yan yana", "Each AI side by side"), [S + "r_rapor_tam.jpg"], [A(l, "rapor", "motor")])],
         g="0|1,2|3|4|5|6|7|8"),
 6: dict(t=("Soru bazında sonuç ve kayıp nedeni", "Results by question, and why you lost"), nxt=("Yapay zekânın baktığı kaynaklar", "The sources AI reads"),
         end=(("Neden kaybettiğinizi biliyorsunuz", "Sıradaki adım: yapay zekânın baktığı siteler."), ("Now you know why", "Next: the sites AI reads.")),
         sc=lambda l, S: [(("Sorular", "Questions"), ("Her soru ayrı ayrı", "Every question separately"), [S + "r_rapor_tam.jpg"], [A(l, "rapor", "soru")]),
                          (("Kayıp nedeni", "Why you lost"), ("Kanıtlarıyla", "With evidence"), [S + "r_rapor_tam.jpg"], [A(l, "rapor", "kayip")]),
                          (("Cevap", "Answer"), ("Tam cevabı okuyun", "Read the full answer"), [S + "r_rapor_cevap_tam.jpg"], [A(l, "rapor_cevap", "gizle", 120)]),
                          (("Koşullar", "Conditions"), ("Hangi müşteride güçlüsünüz?", "Which customers favor you?"), [S + "r_rapor_tam.jpg"], [A(l, "rapor", "kosul")])],
         g="0|1,2|3,4|5|6|7"),
 7: dict(t=("Yapay zekânın baktığı kaynaklar", "The sources AI reads"), nxt=("İyileştirme önerileri", "Improvement recommendations"),
         end=(("Kaynaklarınızı tanıyın", "Önce fırsat sitelerinden başlayın."), ("Know your sources", "Start with the opportunity sites.")),
         sc=lambda l, S: [(("Kaynaklar", "Sources"), ("Yapay zekânın gösterdiği siteler", "Sites the AI cited"), [S + "r_rapor_tam.jpg"], [A(l, "rapor", "kaynak")]),
                          (("Pay", "Share"), ("Sizin, rakibin, üçüncü taraf", "Yours, rivals', third parties'"), [S + "r_rapor_tam.jpg"], [A(l, "rapor", "kendi")]),
                          (("Destek", "Support"), ("Kaynaklar kimi destekliyor?", "Who do sources support?"), [S + "r_rapor_tam.jpg"], [A(l, "rapor", "kimi")]),
                          (("Fırsat", "Opportunity"), ("Yer almanız gereken siteler", "Sites to get featured on"), [S + "r_rapor_tam.jpg"], [A(l, "rapor", "firsat")])],
         g="0|1,2|3|4|5|6"),
 8: dict(t=("İyileştirme önerileri", "Improvement recommendations"), nxt=("Marka algısı ve doğruluk", "Brand perception and accuracy"),
         end=(("Uygulayın, ölçün", "Her ölçümde etkisini görün."), ("Act, then measure", "See the effect in every measurement.")),
         sc=lambda l, S: [(("Rehber", "Guide"), ("Önem sırasıyla adımlar", "Steps by importance"), [S + "r_oneriler_tam.jpg"], [A(l, "oneriler", "rehber")]),
                          (("Kanıt", "Evidence"), ("Kanıt, ne yapmalı, başarı ölçütü", "Evidence, what to do, success check"), [S + "r_oneriler_tam.jpg"], [A(l, "oneriler", "rehber", 500)]),
                          (("Kampanya", "Campaign"), ("Görevlere bölün, takip edin", "Split into tasks, track them"), [S + "r_oneriler_tam.jpg"], [A(l, "oneriler", "rehber", 1350)]),
                          (("Takip", "Tracking"), ("Yaptığınızı tarihiyle yazın", "Log what you did, with a date"), [S + "r_oneriler_tam.jpg"], [A(l, "oneriler", "yaptik")]),
                          (("Site", "Website"), ("Web sitesi kontrolü", "Website check"), [S + "r_oneriler_tam.jpg"], [A(l, "oneriler", "site")])],
         g="0|1|2|3|4,5|6|7"),
}
G = {}
for n, v in V.items():
    for i, l in enumerate(("tr", "en")):
        t = T[l]; S = f"shots/{l}/"
        sc = [dict(step=st[i], cap=cp[i], imgs=im, top=tp[0], **({"tops": tp} if len(tp) > 1 else {}), dur=4) for st, cp, im, tp in v["sc"](l, S)]
        e = v["end"][i]
        cfg = dict(out=f"e{n}{l}", series=t["series"].format(n=n), sample=t["sample"], cover=dict(badge=t["b"].format(n=n), title=v["t"][i], sub="", dur=3),
                   scenes=sc, end=dict(title=e[0], sub=e[1], next_label=t["next"], next=v["nxt"][i], dur=5))
        json.dump(cfg, open(f"egitim-{n}-{l}.json", "w"), ensure_ascii=False, indent=1)
    G[n] = v["g"]
json.dump(G, open("gruplar-4-8.json", "w"))
print("ok")
