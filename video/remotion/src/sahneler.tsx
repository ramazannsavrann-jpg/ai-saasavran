// Sahne türleri. ayar.json "order" listesindeki adlarla eşleşir (make.py ile aynı adlar).
// Her vurgu, seslendirmede ilgili kelimenin söylendiği ana bağlanır (useAn / kelimeAn / cumleBas).
import React from 'react';
import {Easing, interpolate} from 'remotion';
import {Circle, Highlight} from '@remotion/rough-notation';
import {Alt, Baslik, C, Etiket, FONT, L, MOTOR_RENK, Sayac, ac, cumleBas, cumleSon, kelimeAn, useAn, zipla} from './ortak';

type P = {i: number};
const dairePad = (n: number) => ({top: n, right: n, bottom: n, left: n});

// ---------------- Kanca ----------------
export const SKanca: React.FC<P> = ({i}) => {
  const {frame, an, v} = useAn(i);
  const T = v.ayar.t;
  const k = v.ayar.rm.kanca;
  const g = v.gruplar[i];
  const kartAn = cumleBas(v, g[Math.min(1, g.length - 1)]);
  const sifirAn = cumleBas(v, g[g.length - 1]);
  const motorlar = ['ChatGPT', 'Claude', 'Perplexity', 'Gemini'];
  // Başlıkta vurgulanacak kısım: ayar.t.hook içindeki rm.vurgu (yoksa son 2 kelime hariç)
  const hook: string = T.hook;
  const vurgu: string = v.ayar.rm.baslik_vurgu ?? '';
  const [once, sonra] = vurgu && hook.includes(vurgu) ? hook.split(vurgu) : [hook, ''];
  return (
    <>
      <div style={{display: 'flex', gap: 12}}>
        {motorlar.map((m, j) => (
          <div
            key={m}
            style={{
              border: `3px solid ${MOTOR_RENK[m]}`,
              color: MOTOR_RENK[m],
              background: '#fff',
              borderRadius: 40,
              padding: '6px 18px',
              fontWeight: 700,
              fontSize: 26,
              opacity: ac(frame, j * 3, 10),
              scale: zipla(frame, j * 3, 10, 0.5, 2.2),
            }}
          >
            {m}
          </div>
        ))}
      </div>
      <Baslik boy={80} frame={frame} gecikme={6}>
        {once}
        {vurgu ? (
          <Highlight color="rgba(232,84,28,0.25)" progress={ac(frame, an(0.78), 14)}>
            {vurgu}
          </Highlight>
        ) : null}
        {sonra}
      </Baslik>
      <div
        style={{
          marginTop: 44,
          background: C.card,
          borderRadius: 32,
          padding: '30px 36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 12px 40px rgba(120,60,20,0.12)',
          opacity: ac(frame, an(kartAn), 10),
          translate: `0px ${(1 - ac(frame, an(kartAn), 10)) * 40}px`,
        }}
      >
        <div>
          <div style={{fontSize: 30, fontWeight: 600, color: C.muted}}>
            {String(k.ust).split('{n}')[0]}
            <Sayac deger={k.n} bas={an(kartAn)} frame={frame} />
            {String(k.ust).split('{n}')[1]}
          </div>
          <div style={{fontSize: 56, fontWeight: 800, marginTop: 4}}>{k.ana}</div>
          <div style={{fontSize: 30, fontWeight: 600, color: C.muted, marginTop: 4}}>{k.alt}</div>
        </div>
        <div
          style={{
            fontSize: 170,
            fontWeight: 900,
            color: C.red,
            width: 190,
            textAlign: 'center',
            opacity: ac(frame, an(sifirAn), 8),
            scale: interpolate(frame, [an(sifirAn), an(sifirAn) + 8], [2.2, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)}),
          }}
        >
          <Circle color={C.red} strokeWidth={5} padding={dairePad(14)} progress={ac(frame, an(sifirAn) + 1, 7)}>
            {k.deger}
          </Circle>
        </div>
      </div>
      <div style={{marginTop: 34, fontSize: 32, fontWeight: 700, color: C.blue, opacity: ac(frame, an(1.4), 12)}}>{T.hook2}</div>
    </>
  );
};

// ---------------- Marka kartı ----------------
export const SMarkalar: React.FC<P> = ({i}) => {
  const {frame, an, v} = useAn(i);
  const T = v.ayar.t;
  const Ld = L[v.dil];
  const g = v.gruplar[i];
  const b1 = cumleBas(v, g[0]);
  const b2 = kelimeAn(v, i, String(v.ayar.rm.soru_sayisi), cumleSon(v, g[g.length - 1]) - 1.2);
  return (
    <>
      <Etiket frame={frame} renk={C.blue}>
        {Ld.olcum}
      </Etiket>
      <Baslik frame={frame}>{T.names_title}</Baslik>
      <div style={{display: 'flex', flexWrap: 'wrap', gap: 18, marginTop: 40}}>
        {(v.ayar.names_list as string[]).map((a, j) => {
          const ozel = a === v.ayar.rm.kanca_marka;
          return (
            <div
              key={a}
              style={{
                background: ozel ? C.hl : '#fff',
                border: `3px solid ${ozel ? C.orange : '#E9D3BF'}`,
                borderRadius: 24,
                padding: '18px 30px',
                fontSize: 46,
                fontWeight: 800,
                opacity: ac(frame, 6 + j * 2.5, 10),
                scale: zipla(frame, 6 + j * 2.5, 10, 0.4, 1.8),
              }}
            >
              {a}
            </div>
          );
        })}
      </div>
      <div style={{display: 'flex', gap: 24, marginTop: 56}}>
        {(
          [
            [v.ayar.rm.canli_motor, Ld.canliMotor, an(b1)],
            [v.ayar.rm.soru_sayisi, Ld.aliciSorusu, an(b2)],
          ] as [number, string, number][]
        ).map(([n, t, b]) => (
          <div key={t} style={{flex: 1, background: '#fff', borderRadius: 28, padding: '24px 28px', opacity: ac(frame, b, 10)}}>
            <div style={{fontSize: 84, fontWeight: 900, color: C.orange, lineHeight: 1}}>
              <Sayac deger={n} bas={b} sure={12} frame={frame} />
            </div>
            <div style={{fontSize: 28, fontWeight: 600, color: C.muted, marginTop: 6}}>{t}</div>
          </div>
        ))}
      </div>
      <div style={{fontSize: 22, fontWeight: 500, color: C.muted, marginTop: 30, opacity: ac(frame, 20, 12)}}>{v.ayar.footer}</div>
    </>
  );
};

// ---------------- Marka sıralaması ----------------
export const SSiralama: React.FC<P> = ({i}) => {
  const {frame, an, v} = useAn(i);
  const T = v.ayar.t;
  const g = v.gruplar[i];
  const markalar = v.ayar.brands as [string, number][];
  const maks = Math.max(v.ayar.rm.toplam ?? v.ayar.rm.kanca.n, ...markalar.map((m) => m[1]));
  const sonC = g[g.length - 1];
  const sonBas = cumleBas(v, sonC);
  // Vurgu: her markanın bu sahnede (son cümleden önce) ilk anıldığı an
  const vurgu: Record<string, number> = {};
  for (const [ad] of markalar) {
    const t = kelimeAn(v, i, ad, -1);
    if (t >= 0 && t < sonBas) vurgu[ad] = an(t);
  }
  const ilk2 = [...markalar].sort((a, b) => b[1] - a[1]).slice(0, 2);
  const ikinciAn = an(kelimeAn(v, i, ilk2[1][0], sonBas + 1, sonBas));
  const kanca = v.ayar.rm.kanca_marka;
  return (
    <>
      <Etiket frame={frame}>{T.tag_brands}</Etiket>
      <Baslik frame={frame}>{T.who}</Baslik>
      <Alt frame={frame}>{T.who_sub}</Alt>
      <div style={{marginTop: 34}}>
        {markalar.map(([ad, sayi], j) => {
          const b = 8 + j * 4;
          const aktif = vurgu[ad] !== undefined ? ac(frame, vurgu[ad], 8) : 0;
          const renk = ad === ilk2[0][0] ? C.gold : ad === kanca ? C.red : C.blue;
          return (
            <div key={ad} style={{display: 'flex', alignItems: 'center', height: 74, opacity: ac(frame, b, 8)}}>
              <div style={{width: 190, fontSize: 34, fontWeight: 800, color: ad === kanca ? C.red : C.ink}}>{ad}</div>
              <div style={{flex: 1, height: 38, background: C.barBg, borderRadius: 20, position: 'relative', overflow: 'hidden'}}>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: `${(sayi / maks) * 100 * ac(frame, b, 22)}%`,
                    background: renk,
                    borderRadius: 20,
                    boxShadow: aktif ? `0 0 ${24 * aktif}px ${renk}` : 'none',
                  }}
                />
              </div>
              <div
                style={{
                  width: 130,
                  textAlign: 'right',
                  fontSize: 34,
                  fontWeight: 800,
                  color: ad === kanca ? C.red : C.ink,
                  scale: 1 + 0.25 * aktif * (1 - ac(frame, (vurgu[ad] ?? 0) + 10, 10)),
                }}
              >
                <Sayac deger={sayi} bas={b} sure={22} frame={frame} />
                <span style={{fontSize: 22, color: C.muted, fontWeight: 600}}>/{v.ayar.rm.toplam ?? v.ayar.rm.kanca.n}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{marginTop: 22, display: 'flex', gap: 16, opacity: ac(frame, an(sonBas), 10), translate: `0px ${(1 - ac(frame, an(sonBas), 10)) * 30}px`}}>
        <div style={{flex: 1, background: C.gold, color: '#fff', borderRadius: 24, padding: '14px 24px', fontSize: 34, fontWeight: 800}}>
          1. {ilk2[0][0]} · {ilk2[0][1]}
        </div>
        <div style={{flex: 1, background: C.blue, color: '#fff', borderRadius: 24, padding: '14px 24px', fontSize: 34, fontWeight: 800, opacity: ac(frame, ikinciAn, 8)}}>
          2. {ilk2[1][0]} · {ilk2[1][1]}
        </div>
      </div>
    </>
  );
};

// ---------------- Motor tablosu ----------------
export const SMotorlar: React.FC<P> = ({i}) => {
  const {frame, an, v} = useAn(i);
  const T = v.ayar.t;
  const Ld = L[v.dil];
  const g = v.gruplar[i];
  const motorlar = (v.ayar.engines as [string][]).map((e) => e[0]);
  const vurguMarka = v.ayar.rm.motor_vurgu;
  const rowAn = cumleBas(v, g[0]);
  return (
    <>
      <Etiket frame={frame} renk={C.blue}>
        {T.tag_eng}
      </Etiket>
      <Baslik frame={frame} boy={64}>
        {T.eng}
      </Baslik>
      <Alt frame={frame}>{T.eng_sub}</Alt>
      <div style={{marginTop: 30, background: '#fff', borderRadius: 32, padding: '20px 22px'}}>
        <div style={{display: 'flex', paddingLeft: 200}}>
          {motorlar.map((m, j) => (
            <div key={m} style={{flex: 1, textAlign: 'center', fontSize: 22, fontWeight: 800, color: MOTOR_RENK[m], opacity: ac(frame, 6 + j * 2, 8)}}>
              {m}
              <div style={{fontSize: 18, color: C.muted, fontWeight: 600}}>{m === 'Gemini' ? v.ayar.gemini_label : Ld.canliArama}</div>
            </div>
          ))}
        </div>
        {(v.ayar.eng_rows as (string | number)[][]).map((row, ri) => {
          const ad = row[0] as string;
          const vurgulu = ad === vurguMarka;
          const degerler = row.slice(1) as number[];
          const maks = Math.max(...degerler);
          const min = Math.min(...degerler);
          return (
            <div
              key={ad}
              style={{
                display: 'flex',
                alignItems: 'center',
                height: 96,
                borderRadius: 22,
                marginTop: 6,
                background: vurgulu ? `rgba(255,210,172,${ac(frame, an(rowAn), 10)})` : 'transparent',
                opacity: ac(frame, 10 + ri * 5, 8),
              }}
            >
              <div style={{width: 200, paddingLeft: 14, fontSize: 36, fontWeight: 800}}>{ad}</div>
              {degerler.map((d, ci) => {
                const m = motorlar[ci];
                let daire: {renk: string; t: number} | null = null;
                // Vurgulanan satırda en yüksek (altın) ve en düşük/0 (kırmızı) hücre, motorun adı söylendiği anda daire içine alınır
                if (vurgulu && (d === min || d === maks) && min < maks) {
                  const t = kelimeAn(v, i, m, -1, rowAn);
                  if (t >= 0) daire = {renk: d === maks ? C.gold : C.red, t: an(t)};
                }
                const sayi = <Sayac deger={d} bas={10 + ri * 5 + ci * 2} frame={frame} />;
                return (
                  <div key={ci} style={{flex: 1, textAlign: 'center', fontSize: 52, fontWeight: 900, color: d === 0 ? C.red : MOTOR_RENK[m]}}>
                    {daire ? (
                      <Circle color={daire.renk} strokeWidth={4} padding={dairePad(10)} progress={ac(frame, daire.t, 10)}>
                        {sayi}
                      </Circle>
                    ) : (
                      sayi
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      <div style={{fontSize: 24, fontWeight: 600, color: C.blue, marginTop: 20, lineHeight: 1.3, opacity: ac(frame, 30, 10)}}>{T.eng_note}</div>
    </>
  );
};

// ---------------- Soru bazında ----------------
export const SSorular: React.FC<P> = ({i}) => {
  const {frame, an, v} = useAn(i);
  const T = v.ayar.t;
  const kel: Record<string, string> = v.ayar.rm.soru_kelime ?? {};
  return (
    <>
      <Etiket frame={frame}>{T.tag_q}</Etiket>
      <Baslik frame={frame}>{T.byq}</Baslik>
      <Alt frame={frame}>{T.byq_sub}</Alt>
      <div style={{marginTop: 28}}>
        {(v.ayar.questions as [string, [string, string, boolean][]][]).map(([soru, cevaplar], j) => {
          const t = kel[String(j)] ? kelimeAn(v, i, kel[String(j)], -1) : -1;
          const a = t < 0 ? 0 : ac(frame, an(t), 10);
          return (
            <div
              key={soru}
              style={{
                background: '#fff',
                borderRadius: 26,
                padding: '18px 26px',
                marginTop: 14,
                border: `3px solid rgba(232,84,28,${a})`,
                scale: 1 + 0.03 * a,
                opacity: ac(frame, 8 + j * 4, 10),
                translate: `${(1 - ac(frame, 8 + j * 4, 10)) * 120}px 0px`,
              }}
            >
              <div style={{fontSize: 26, fontWeight: 600, color: C.muted}}>{soru}</div>
              <div style={{display: 'flex', gap: 30, marginTop: 6}}>
                {cevaplar.map(([m, oran, degisti]) => (
                  <div key={m} style={{fontSize: 38, fontWeight: 800, color: degisti ? C.orange : C.ink}}>
                    {m} <span style={{fontWeight: 700, color: degisti ? C.orange : C.muted}}>{oran}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

// ---------------- Tutarlılık / güven puanı ----------------
export const SGuven: React.FC<P> = ({i}) => {
  const {frame, an, v} = useAn(i);
  const T = v.ayar.t;
  const g = v.gruplar[i];
  const [kutu, puanKutu] = v.ayar.boxes;
  const satirAn = cumleBas(v, g[Math.min(1, g.length - 1)]);
  const gostAn = cumleBas(v, g[g.length - 1]);
  const gostSon = cumleSon(v, g[g.length - 1]);
  const puanYazi: string = puanKutu.lines[0][0];
  const hedef = Number((puanYazi.match(/\d+/) ?? ['0'])[0]);
  const puan = interpolate(frame, [an(gostAn), an(gostSon) + 6], [0, hedef], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const R = 120;
  const cevre = Math.PI * R;
  return (
    <>
      <Etiket frame={frame} renk={C.blue}>
        {T.tag_box}
      </Etiket>
      <Baslik frame={frame}>{T.box}</Baslik>
      <div style={{background: '#fff', borderRadius: 30, padding: '26px 30px', marginTop: 34, opacity: ac(frame, 6, 10)}}>
        <div style={{fontSize: 26, fontWeight: 600, color: C.muted}}>{kutu.title}</div>
        {(kutu.lines as [string, string][]).map(([t, tur], j) => (
          <div key={t} style={{fontSize: 42, fontWeight: 800, marginTop: 12, color: tur === 'good' ? C.blue : C.red, opacity: ac(frame, an(satirAn) - 6 + j * 4, 10)}}>
            {j === 0 ? (
              <Highlight color="rgba(31,95,191,0.18)" progress={ac(frame, an(satirAn) + 15, 14)}>
                {t}
              </Highlight>
            ) : (
              t
            )}
          </div>
        ))}
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: 34, marginTop: 34, opacity: ac(frame, an(gostAn) - 4, 10)}}>
        <svg width={280} height={160} viewBox="0 0 280 160">
          <path d={`M 20 140 A ${R} ${R} 0 0 1 260 140`} stroke={C.barBg} strokeWidth={26} fill="none" strokeLinecap="round" />
          <path
            d={`M 20 140 A ${R} ${R} 0 0 1 260 140`}
            stroke={C.gold}
            strokeWidth={26}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={cevre}
            strokeDashoffset={cevre * (1 - puan / 100)}
          />
          <text x="140" y="132" textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={64} fill={C.ink}>
            {Math.round(puan)}
          </text>
        </svg>
        <div>
          <div style={{fontSize: 30, fontWeight: 600, color: C.muted}}>{puanKutu.title}</div>
          <div style={{fontSize: 54, fontWeight: 900, color: C.gold}}>{puanYazi}</div>
        </div>
      </div>
    </>
  );
};

// ---------------- Yapay zekâ ile Google Shopping ----------------
export const SShopping: React.FC<P> = ({i}) => {
  const {frame, an, v} = useAn(i);
  const T = v.ayar.t;
  const g = v.gruplar[i];
  const satirlar = v.ayar.shop.rows as [string, string, string, boolean][];
  const birinci = satirlar.find((r) => /^1\b/.test(r[2]))?.[0];
  const birinciAn = birinci ? kelimeAn(v, i, birinci, cumleSon(v, g[0]) - 0.5) : 0;
  const vurguBas = cumleBas(v, g[g.length - 1]);
  const vurguSon = cumleSon(v, g[g.length - 1]) - 0.4;
  return (
    <>
      <Etiket frame={frame}>{T.tag_shop}</Etiket>
      <Baslik frame={frame}>{T.shop}</Baslik>
      <Alt frame={frame}>{T.shop_sub}</Alt>
      <div style={{background: '#fff', borderRadius: 30, padding: '16px 26px', marginTop: 28}}>
        <div style={{display: 'flex', fontSize: 24, fontWeight: 800, color: C.muted, paddingBottom: 6}}>
          <div style={{flex: 1}} />
          <div style={{width: 200, textAlign: 'center', color: C.blue}}>{T.shop_col_ai}</div>
          <div style={{width: 200, textAlign: 'center', color: C.gold}}>{T.shop_col_shop}</div>
        </div>
        {satirlar.map(([ad, yz, sh, vurgu], j) => {
          const fa = vurgu ? ac(frame, an(vurguBas), 10) : 0;
          const daire = vurgu || ad === birinci;
          return (
            <div
              key={ad}
              style={{
                display: 'flex',
                alignItems: 'center',
                height: 82,
                borderRadius: 20,
                background: vurgu ? `rgba(255,210,172,${fa})` : 'transparent',
                opacity: ac(frame, 8 + j * 4, 8),
                translate: `${(1 - ac(frame, 8 + j * 4, 8)) * -80}px 0px`,
              }}
            >
              <div style={{flex: 1, paddingLeft: 10, fontSize: 38, fontWeight: 800, color: vurgu ? C.red : C.ink}}>{ad}</div>
              <div style={{width: 200, textAlign: 'center', fontSize: 40, fontWeight: 800, color: C.blue}}>{yz}</div>
              <div style={{width: 200, textAlign: 'center', fontSize: 40, fontWeight: 800, color: C.gold}}>
                {daire ? (
                  <Circle color={vurgu ? C.red : C.gold} strokeWidth={4} padding={dairePad(10)} progress={ac(frame, an(vurgu ? vurguSon : birinciAn), 10)}>
                    {sh}
                  </Circle>
                ) : (
                  sh
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{fontSize: 28, fontWeight: 700, color: C.blue, marginTop: 20, opacity: ac(frame, an(vurguBas) - 10, 10)}}>{T.shop_note}</div>
    </>
  );
};

// ---------------- Kaynak ağı ----------------
export const SKaynak: React.FC<P> = ({i}) => {
  const {frame, an, v} = useAn(i);
  const T = v.ayar.t;
  const g = v.gruplar[i];
  const {left, right, links} = v.ayar.net as {left: [string, number][]; right: string[]; links: number[][]};
  const solY = (j: number) => 34 + j * 84;
  const sagY = (j: number) => 50 + j * 100;
  const enCok = ac(frame, an(cumleBas(v, g[g.length - 1])), 10);
  const lider = (v.ayar.brands as [string, number][])[0][0];
  return (
    <>
      <Etiket frame={frame}>{T.tag_net}</Etiket>
      <Baslik frame={frame}>{T.net}</Baslik>
      <Alt frame={frame}>{T.net_sub}</Alt>
      <svg width={800} height={500} style={{marginTop: 10}}>
        {links.map(([l, r, w], j) => {
          const x0 = 330;
          const x1 = 600;
          const y0 = solY(l);
          const y1 = sagY(r);
          const uz = 420;
          const p = ac(frame, 8 + j * 0.8, 16);
          const ilk = l === 0;
          return (
            <path
              key={j}
              d={`M ${x0} ${y0} C ${x0 + 120} ${y0}, ${x1 - 120} ${y1}, ${x1} ${y1}`}
              fill="none"
              stroke={ilk && enCok > 0 ? C.orange : C.blue}
              strokeOpacity={ilk ? 0.55 + 0.4 * enCok : 0.4 * (1 - 0.5 * enCok)}
              strokeWidth={1 + w * 0.7}
              strokeDasharray={uz}
              strokeDashoffset={uz * (1 - p)}
            />
          );
        })}
        {left.map(([ad, n], j) => (
          <text
            key={ad}
            x={316}
            y={solY(j) + 9}
            textAnchor="end"
            fontFamily={FONT}
            fontWeight={j === 0 ? 800 : 700}
            fontSize={Math.min(j === 0 ? 31 + 3 * enCok : 28, Math.floor(300 / (0.56 * String(ad).length + 1.2)))}
            fill={j === 0 && enCok > 0 ? C.orange : C.ink}
            opacity={ac(frame, 4 + j * 2, 8)}
          >
            {ad}{' '}
            <tspan fill={C.muted} fontSize={22}>
              {n}
            </tspan>
          </text>
        ))}
        {right.map((ad, j) => (
          <text key={ad} x={614} y={sagY(j) + 10} fontFamily={FONT} fontWeight={800} fontSize={32} fill={ad === lider ? C.gold : C.ink} opacity={ac(frame, 10 + j * 2, 8)}>
            {ad}
          </text>
        ))}
      </svg>
      <div style={{fontSize: 28, fontWeight: 700, color: C.blue, marginTop: 6, opacity: enCok}}>{T.net_note}</div>
    </>
  );
};

// ---------------- Kapanış ----------------
export const SKapanis: React.FC<P> = ({i}) => {
  const {frame, an, v} = useAn(i);
  const T = v.ayar.t;
  const g = v.gruplar[i];
  const dugme = Math.min(cumleBas(v, g[0]) + 1.4, cumleSon(v, g[0]));
  const ucretsiz = cumleBas(v, g[g.length - 1]);
  const nabiz = 1 + 0.035 * Math.max(0, Math.sin((frame - an(dugme)) / 6)) * ac(frame, an(dugme) + 6, 6);
  return (
    <>
      <Baslik frame={frame} boy={86} gecikme={0}>
        {T.cta}
      </Baslik>
      <Alt frame={frame} gecikme={10}>
        {T.cta2}
      </Alt>
      <div
        style={{
          marginTop: 60,
          background: C.orange,
          color: '#fff',
          borderRadius: 30,
          padding: '34px 0',
          textAlign: 'center',
          fontSize: 58,
          fontWeight: 900,
          boxShadow: '0 18px 50px rgba(232,84,28,0.35)',
          opacity: ac(frame, an(dugme), 10),
          scale: nabiz * zipla(frame, an(dugme), 12, 0.7),
        }}
      >
        aisaasavran.com
      </div>
      <div style={{textAlign: 'center', fontSize: 32, fontWeight: 700, color: C.blue, marginTop: 24, opacity: ac(frame, an(ucretsiz), 10)}}>{T.free}</div>
      <div style={{fontSize: 20, fontWeight: 500, color: C.muted, marginTop: 60, lineHeight: 1.4, opacity: ac(frame, 30, 12)}}>{T.disc}</div>
    </>
  );
};

export const SAHNE_TURU: Record<string, React.FC<P>> = {
  s1: SKanca,
  names: SMarkalar,
  s2: SSiralama,
  s3: SMotorlar,
  s4: SSorular,
  boxes: SGuven,
  shop: SShopping,
  net: SKaynak,
  s8: SKapanis,
};
