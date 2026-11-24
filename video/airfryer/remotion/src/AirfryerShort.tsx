import React from 'react';
import {
  AbsoluteFill,
  getInputProps,
  Easing,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {Audio} from '@remotion/media';
import {loadFont} from '@remotion/fonts';
import {Circle, Highlight} from '@remotion/rough-notation';
import ayar from './data/ayar.json';
import kelimeler from './data/kelimeler.json';

// ---- Yazı tipi (sistemdeki Inter, public/ içine kopyalandı; indirme yok)
for (const [w, f] of [
  ['500', 'Inter-Medium.otf'],
  ['600', 'Inter-SemiBold.otf'],
  ['700', 'Inter-Bold.otf'],
  ['800', 'Inter-ExtraBold.otf'],
  ['900', 'Inter-Black.otf'],
] as const) {
  loadFont({family: 'Inter', url: staticFile(f), weight: w});
}

// ---- "Sıcak Hava" teması (airfryer/TASARIM.md ile aynı renkler)
const C = {
  bg1: '#FFF6EC',
  bg2: '#FFE7D1',
  ink: '#1E1612',
  muted: '#7A6A5E',
  orange: '#E8541C',
  blue: '#1F5FBF',
  gold: '#B86E00',
  red: '#C8283C',
  green: '#10785A',
  card: '#FFFFFF',
  hl: '#FFD2AC',
  barBg: '#F4DECA',
};
const MOTOR_RENK: Record<string, string> = {
  ChatGPT: '#10785A',
  Claude: '#C45A28',
  Perplexity: '#1F5FBF',
  Gemini: '#963CA0',
};
const FONT = 'Inter, sans-serif';
const T = ayar.t;

// ---- Sahne başlangıçları: seslendirmedeki kelime zamanlarından (saniye)
const S = [0, 6.34, 9.6, 15.05, 19.7, 24.5, 29.25, 33.2, 36.8];
export const TOPLAM_SN = 42.2;

type Kelime = {w: string; s: number; e: number};
const K = kelimeler as Kelime[];

// ---- Yardımcılar
const yumusak = Easing.bezier(0.16, 1, 0.3, 1);
const ac = (frame: number, bas: number, sure = 12) =>
  interpolate(frame, [bas, bas + sure], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: yumusak,
  });

// Sahne içinde mutlak saniyeyi (sesteki an) sahne karesine çevirir
const useAn = (sahneBas: number) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return {frame, fps, an: (sn: number) => (sn - sahneBas) * fps};
};

const Sayac: React.FC<{deger: number; bas: number; sure?: number; frame: number}> = ({
  deger,
  bas,
  sure = 18,
  frame,
}) => (
  <>
    {Math.round(
      interpolate(frame, [bas, bas + sure], [0, deger], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.out(Easing.cubic),
      }),
    )}
  </>
);

const Logo: React.FC<{s?: number}> = ({s = 64}) => (
  <svg width={s} height={s} viewBox="0 0 64 64">
    <rect width="64" height="64" rx="16" fill="#0F6E5C" />
    <circle cx="32" cy="32" r="10" fill="#F4F7F5" />
    {Array.from({length: 10}).map((_, i) => {
      const a0 = (i * 36 * Math.PI) / 180;
      const a1 = ((i * 36 + 18) * Math.PI) / 180;
      const r = 20;
      return (
        <path
          key={i}
          d={`M ${32 + r * Math.cos(a0)} ${32 + r * Math.sin(a0)} A ${r} ${r} 0 0 1 ${32 + r * Math.cos(a1)} ${32 + r * Math.sin(a1)}`}
          stroke="#F4F7F5"
          strokeWidth={4}
          fill="none"
        />
      );
    })}
  </svg>
);

const Zemin: React.FC = () => {
  const frame = useCurrentFrame();
  // Sağ üstte yavaş nefes alan sıcak hale (fırın sıcaklığı)
  const nefes = 0.55 + 0.1 * Math.sin(frame / 40);
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 92% 6%, rgba(255,150,80,${nefes}) 0%, rgba(255,150,80,0) 46%), linear-gradient(180deg, ${C.bg1} 0%, ${C.bg2} 100%)`,
      }}
    />
  );
};

const Ust: React.FC = () => (
  <div style={{position: 'absolute', left: 80, top: 178, display: 'flex', alignItems: 'center', gap: 18}}>
    <Logo s={58} />
    <div>
      <div style={{fontFamily: FONT, fontWeight: 800, fontSize: 30, color: C.ink}}>AI SaaSavran</div>
      <div style={{fontFamily: FONT, fontWeight: 500, fontSize: 20, color: C.muted}}>aisaasavran.com</div>
    </div>
  </div>
);

// Sahne kabı: içerik güvenli alanda (x 80–880, y 280–1150); altta altyazı bandı
const Sahne: React.FC<{children: React.ReactNode; sure: number}> = ({children, sure}) => {
  const frame = useCurrentFrame();
  const giris = ac(frame, 0, 10);
  const cikis = interpolate(frame, [sure - 6, sure], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{opacity: Math.min(giris, cikis)}}>
      <div
        style={{
          position: 'absolute',
          left: 80,
          top: 280,
          width: 800,
          height: 880,
          translate: `0px ${(1 - giris) * 40}px`,
          fontFamily: FONT,
          color: C.ink,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

const Etiket: React.FC<{children: React.ReactNode; renk?: string; frame: number}> = ({children, renk = C.orange, frame}) => (
  <div
    style={{
      display: 'inline-block',
      background: renk,
      color: '#fff',
      fontWeight: 700,
      fontSize: 28,
      padding: '8px 20px',
      borderRadius: 40,
      scale: interpolate(frame, [0, 10], [0.6, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(2))}),
    }}
  >
    {children}
  </div>
);

const Baslik: React.FC<{children: React.ReactNode; boy?: number; frame: number; gecikme?: number}> = ({
  children,
  boy = 68,
  frame,
  gecikme = 3,
}) => (
  <div
    style={{
      fontWeight: 800,
      fontSize: boy,
      lineHeight: 1.08,
      letterSpacing: -1.5,
      marginTop: 22,
      opacity: ac(frame, gecikme, 12),
      translate: `0px ${(1 - ac(frame, gecikme, 12)) * 24}px`,
    }}
  >
    {children}
  </div>
);

const Alt: React.FC<{children: React.ReactNode; frame: number; gecikme?: number}> = ({children, frame, gecikme = 8}) => (
  <div style={{fontWeight: 600, fontSize: 30, color: C.muted, marginTop: 14, lineHeight: 1.3, opacity: ac(frame, gecikme, 12)}}>
    {children}
  </div>
);

// ================= SAHNELER =================

const S1Kanca: React.FC = () => {
  const {frame, an} = useAn(S[0]);
  const motorlar = ['ChatGPT', 'Claude', 'Perplexity', 'Gemini'];
  const sifir = ac(frame, an(5.9), 8);
  return (
    <>
      <div style={{display: 'flex', gap: 12}}>
        {motorlar.map((m, i) => (
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
              opacity: ac(frame, i * 3, 10),
              scale: interpolate(frame, [i * 3, i * 3 + 10], [0.5, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(2.2))}),
            }}
          >
            {m}
          </div>
        ))}
      </div>
      <Baslik boy={80} frame={frame} gecikme={6}>
        Kasım Fırsatları: Yapay zekâ{' '}
        <Highlight color="rgba(232,84,28,0.25)" progress={ac(frame, an(0.78), 14)}>
          hangi airfryer&apos;ı
        </Highlight>{' '}
        öneriyor?
      </Baslik>
      {/* 66 cevapta Fakir kaç kez geçti? → Hiç. */}
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
          opacity: ac(frame, an(3.0), 10),
          translate: `0px ${(1 - ac(frame, an(3.0), 10)) * 40}px`,
        }}
      >
        <div>
          <div style={{fontSize: 30, fontWeight: 600, color: C.muted}}>
            <Sayac deger={66} bas={an(3.0)} frame={frame} /> yapay zekâ cevabında
          </div>
          <div style={{fontSize: 56, fontWeight: 800, marginTop: 4}}>Yerli marka Fakir</div>
          <div style={{fontSize: 30, fontWeight: 600, color: C.muted, marginTop: 4}}>kaç kez geçti?</div>
        </div>
        <div
          style={{
            fontSize: 170,
            fontWeight: 900,
            color: C.red,
            width: 190,
            textAlign: 'center',
            opacity: sifir,
            scale: interpolate(frame, [an(5.9), an(5.9) + 8], [2.2, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)}),
          }}
        >
          <Circle color={C.red} strokeWidth={5} padding={{top: 14, right: 14, bottom: 14, left: 14}} progress={ac(frame, an(5.9) + 1, 7)}>
            0
          </Circle>
        </div>
      </div>
      <div style={{marginTop: 34, fontSize: 32, fontWeight: 700, color: C.blue, opacity: ac(frame, an(1.4), 12)}}>
        {T.hook2}
      </div>
    </>
  );
};

const S2Markalar: React.FC = () => {
  const {frame, an} = useAn(S[1]);
  const adlar = ayar.names_list;
  return (
    <>
      <Etiket frame={frame} renk={C.blue}>
        Ölçüm
      </Etiket>
      <Baslik frame={frame}>{T.names_title}</Baslik>
      <div style={{display: 'flex', flexWrap: 'wrap', gap: 18, marginTop: 40}}>
        {adlar.map((a, i) => (
          <div
            key={a}
            style={{
              background: a === 'Fakir' ? C.hl : '#fff',
              border: `3px solid ${a === 'Fakir' ? C.orange : '#E9D3BF'}`,
              borderRadius: 24,
              padding: '18px 30px',
              fontSize: 46,
              fontWeight: 800,
              opacity: ac(frame, 6 + i * 2.5, 10),
              scale: interpolate(frame, [6 + i * 2.5, 16 + i * 2.5], [0.4, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.8))}),
            }}
          >
            {a}
          </div>
        ))}
      </div>
      <div style={{display: 'flex', gap: 24, marginTop: 56}}>
        {[
          ['3', 'canlı aramalı yapay zekâ', an(6.64)],
          ['11', 'alıcı sorusu', an(8.38)],
        ].map(([n, t, b]) => (
          <div key={t as string} style={{flex: 1, background: '#fff', borderRadius: 28, padding: '24px 28px', opacity: ac(frame, b as number, 10)}}>
            <div style={{fontSize: 84, fontWeight: 900, color: C.orange, lineHeight: 1}}>
              <Sayac deger={Number(n)} bas={b as number} sure={12} frame={frame} />
            </div>
            <div style={{fontSize: 28, fontWeight: 600, color: C.muted, marginTop: 6}}>{t}</div>
          </div>
        ))}
      </div>
      <div style={{fontSize: 22, fontWeight: 500, color: C.muted, marginTop: 30, opacity: ac(frame, 20, 12)}}>{ayar.footer}</div>
    </>
  );
};

const S3Yaris: React.FC = () => {
  const {frame, an} = useAn(S[2]);
  const vurgu: Record<string, number> = {Xiaomi: an(10.64), Philips: an(12.14)};
  const maks = 66;
  return (
    <>
      <Etiket frame={frame}>{T.tag_brands}</Etiket>
      <Baslik frame={frame}>{T.who}</Baslik>
      <Alt frame={frame}>{T.who_sub}</Alt>
      <div style={{marginTop: 34}}>
        {ayar.brands.map(([ad, n], i) => {
          const b = 8 + i * 4;
          const sayi = n as number;
          const aktif = vurgu[ad as string] !== undefined ? ac(frame, vurgu[ad as string], 8) : 0;
          const renk = ad === 'Philips' ? C.gold : ad === 'Fakir' ? C.red : C.blue;
          return (
            <div key={ad as string} style={{display: 'flex', alignItems: 'center', height: 74, opacity: ac(frame, b, 8)}}>
              <div style={{width: 190, fontSize: 34, fontWeight: 800, color: ad === 'Fakir' ? C.red : C.ink}}>{ad}</div>
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
                  color: ad === 'Fakir' ? C.red : C.ink,
                  scale: 1 + 0.25 * aktif * (1 - ac(frame, (vurgu[ad as string] ?? 0) + 10, 10)),
                }}
              >
                <Sayac deger={sayi} bas={b} sure={22} frame={frame} />
                <span style={{fontSize: 22, color: C.muted, fontWeight: 600}}>/66</span>
              </div>
            </div>
          );
        })}
      </div>
      {/* Sonuç: Philips 56, Xiaomi 37 */}
      <div
        style={{
          marginTop: 22,
          display: 'flex',
          gap: 16,
          opacity: ac(frame, an(13.22), 10),
          translate: `0px ${(1 - ac(frame, an(13.22), 10)) * 30}px`,
        }}
      >
        <div style={{flex: 1, background: C.gold, color: '#fff', borderRadius: 24, padding: '14px 24px', fontSize: 34, fontWeight: 800}}>
          1. Philips · 56
        </div>
        <div style={{flex: 1, background: C.blue, color: '#fff', borderRadius: 24, padding: '14px 24px', fontSize: 34, fontWeight: 800, opacity: ac(frame, an(14.58), 8)}}>
          2. Xiaomi · 37
        </div>
      </div>
    </>
  );
};

const S4Motorlar: React.FC = () => {
  const {frame, an} = useAn(S[3]);
  const motorlar = ayar.engines.map((e) => e[0]);
  const hucre = (ri: number, ci: number) => 10 + ri * 5 + ci * 2;
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
          {motorlar.map((m, i) => (
            <div key={m} style={{flex: 1, textAlign: 'center', fontSize: 22, fontWeight: 800, color: MOTOR_RENK[m], opacity: ac(frame, 6 + i * 2, 8)}}>
              {m}
              <div style={{fontSize: 18, color: C.muted, fontWeight: 600}}>{m === 'Gemini' ? ayar.gemini_label : 'canlı arama'}</div>
            </div>
          ))}
        </div>
        {ayar.eng_rows.map((row, ri) => {
          const ad = row[0] as string;
          const vurgulu = ad === 'Cosori';
          const vurguAc = vurgulu ? ac(frame, an(15.14), 10) : 0;
          return (
            <div
              key={ad}
              style={{
                display: 'flex',
                alignItems: 'center',
                height: 96,
                borderRadius: 22,
                marginTop: 6,
                background: vurgulu ? `rgba(255,210,172,${vurguAc})` : 'transparent',
                opacity: ac(frame, 10 + ri * 5, 8),
              }}
            >
              <div style={{width: 200, paddingLeft: 14, fontSize: 36, fontWeight: 800}}>{ad}</div>
              {(row.slice(1) as number[]).map((v, ci) => {
                const m = motorlar[ci];
                // Cosori: Gemini 21 (16.72'de) altın daire; ChatGPT ve Perplexity 0 (17.82 / 18.48'de) kırmızı daire
                let daire: {renk: string; an: number} | null = null;
                if (vurgulu && m === 'Gemini') daire = {renk: C.gold, an: an(16.72)};
                if (vurgulu && m === 'ChatGPT') daire = {renk: C.red, an: an(17.82)};
                if (vurgulu && m === 'Perplexity') daire = {renk: C.red, an: an(18.48)};
                return (
                  <div key={ci} style={{flex: 1, textAlign: 'center', fontSize: 52, fontWeight: 900, color: v === 0 ? C.red : MOTOR_RENK[m]}}>
                    {daire ? (
                      <Circle color={daire.renk} strokeWidth={4} padding={{top: 10, right: 10, bottom: 10, left: 10}} progress={ac(frame, daire.an, 10)}>
                        <Sayac deger={v} bas={hucre(ri, ci)} frame={frame} />
                      </Circle>
                    ) : (
                      <Sayac deger={v} bas={hucre(ri, ci)} frame={frame} />
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

const S5Sorular: React.FC = () => {
  const {frame, an} = useAn(S[4]);
  const vurgu = [null, an(21.6), null, an(23.0)];
  return (
    <>
      <Etiket frame={frame}>{T.tag_q}</Etiket>
      <Baslik frame={frame}>{T.byq}</Baslik>
      <Alt frame={frame}>{T.byq_sub}</Alt>
      <div style={{marginTop: 28}}>
        {ayar.questions.map(([soru, cevaplar], i) => {
          const v = vurgu[i];
          const a = v === null ? 0 : ac(frame, v, 10);
          return (
            <div
              key={soru as string}
              style={{
                background: '#fff',
                borderRadius: 26,
                padding: '18px 26px',
                marginTop: 14,
                border: `3px solid ${a > 0 ? `rgba(232,84,28,${a})` : 'transparent'}`,
                scale: 1 + 0.03 * a,
                opacity: ac(frame, 8 + i * 4, 10),
                translate: `${(1 - ac(frame, 8 + i * 4, 10)) * 120}px 0px`,
              }}
            >
              <div style={{fontSize: 26, fontWeight: 600, color: C.muted}}>{soru as string}</div>
              <div style={{display: 'flex', gap: 30, marginTop: 6}}>
                {(cevaplar as [string, string, boolean][]).map(([m, oran, degisti]) => (
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

const S6Guven: React.FC = () => {
  const {frame, an} = useAn(S[5]);
  const kutu = ayar.boxes[0];
  const puan = interpolate(frame, [an(27.76), an(28.78) + 6], [0, 84], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const R = 120;
  const cevre = Math.PI * R; // yarım daire
  return (
    <>
      <Etiket frame={frame} renk={C.blue}>
        {T.tag_box}
      </Etiket>
      <Baslik frame={frame}>{T.box}</Baslik>
      <div style={{background: '#fff', borderRadius: 30, padding: '26px 30px', marginTop: 34, opacity: ac(frame, 6, 10)}}>
        <div style={{fontSize: 26, fontWeight: 600, color: C.muted}}>{kutu.title}</div>
        {kutu.lines.map(([t, tur], i) => {
          const claude = i === 0;
          return (
            <div
              key={t}
              style={{
                fontSize: 42,
                fontWeight: 800,
                marginTop: 12,
                color: tur === 'good' ? C.blue : C.red,
                opacity: ac(frame, an(25.94) - 6 + i * 4, 10),
              }}
            >
              {claude ? (
                <Highlight color="rgba(31,95,191,0.18)" progress={ac(frame, an(26.44), 14)}>
                  {t}
                </Highlight>
              ) : (
                t
              )}
            </div>
          );
        })}
      </div>
      {/* Güven puanı göstergesi */}
      <div style={{display: 'flex', alignItems: 'center', gap: 34, marginTop: 34, opacity: ac(frame, an(27.6), 10)}}>
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
          <div style={{fontSize: 30, fontWeight: 600, color: C.muted}}>Güven puanı · 66 canlı cevap</div>
          <div style={{fontSize: 54, fontWeight: 900, color: C.gold}}>84 / 100 · Yüksek</div>
        </div>
      </div>
    </>
  );
};

const S7Shopping: React.FC = () => {
  const {frame, an} = useAn(S[6]);
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
        {ayar.shop.rows.map(([ad, yz, sh, vurgu], i) => {
          const fakir = vurgu as boolean;
          const fa = fakir ? ac(frame, an(32.4), 10) : 0;
          const xiaomiBir = ad === 'Xiaomi';
          return (
            <div
              key={ad as string}
              style={{
                display: 'flex',
                alignItems: 'center',
                height: 82,
                borderRadius: 20,
                background: fakir ? `rgba(255,210,172,${fa})` : 'transparent',
                opacity: ac(frame, 8 + i * 4, 8),
                translate: `${(1 - ac(frame, 8 + i * 4, 8)) * -80}px 0px`,
              }}
            >
              <div style={{flex: 1, paddingLeft: 10, fontSize: 38, fontWeight: 800, color: fakir ? C.red : C.ink}}>{ad as string}</div>
              <div style={{width: 200, textAlign: 'center', fontSize: 40, fontWeight: 800, color: C.blue}}>{yz as string}</div>
              <div style={{width: 200, textAlign: 'center', fontSize: 40, fontWeight: 800, color: C.gold}}>
                {xiaomiBir || fakir ? (
                  <Circle color={fakir ? C.red : C.gold} strokeWidth={4} padding={{top: 10, right: 10, bottom: 10, left: 10}} progress={ac(frame, fakir ? an(33.0) : an(30.36), 10)}>
                    {sh as string}
                  </Circle>
                ) : (
                  (sh as string)
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{fontSize: 28, fontWeight: 700, color: C.blue, marginTop: 20, opacity: ac(frame, an(31.3), 10)}}>{T.shop_note}</div>
    </>
  );
};

const S8Kaynak: React.FC = () => {
  const {frame, an} = useAn(S[7]);
  const {left, right, links} = ayar.net;
  const solY = (i: number) => 34 + i * 84;
  const sagY = (i: number) => 50 + i * 100;
  const enCok = ac(frame, an(35.22), 10);
  return (
    <>
      <Etiket frame={frame}>{T.tag_net}</Etiket>
      <Baslik frame={frame}>{T.net}</Baslik>
      <Alt frame={frame}>{T.net_sub}</Alt>
      <svg width={800} height={500} style={{marginTop: 10}}>
        {(links as number[][]).map(([l, r, w], i) => {
          const x0 = 330;
          const x1 = 600;
          const y0 = solY(l);
          const y1 = sagY(r);
          const d = `M ${x0} ${y0} C ${x0 + 120} ${y0}, ${x1 - 120} ${y1}, ${x1} ${y1}`;
          const uz = 420;
          const p = ac(frame, 8 + i * 0.8, 16);
          const hava = l === 0;
          return (
            <path
              key={i}
              d={d}
              fill="none"
              stroke={hava && enCok > 0 ? C.orange : C.blue}
              strokeOpacity={hava ? 0.55 + 0.4 * enCok : 0.4 * (1 - 0.5 * enCok)}
              strokeWidth={1 + w * 0.7}
              strokeDasharray={uz}
              strokeDashoffset={uz * (1 - p)}
            />
          );
        })}
        {left.map(([ad, n], i) => (
          <text
            key={ad as string}
            x={316}
            y={solY(i) + 9}
            textAnchor="end"
            fontFamily={FONT}
            fontWeight={i === 0 ? 800 : 700}
            fontSize={i === 0 ? 31 + 3 * enCok : 28}
            fill={i === 0 && enCok > 0 ? C.orange : C.ink}
            opacity={ac(frame, 4 + i * 2, 8)}
          >
            {ad as string} <tspan fill={C.muted} fontSize={22}>{n as number}</tspan>
          </text>
        ))}
        {right.map((ad, i) => (
          <text key={ad} x={614} y={sagY(i) + 10} fontFamily={FONT} fontWeight={800} fontSize={32} fill={ad === 'Philips' ? C.gold : C.ink} opacity={ac(frame, 10 + i * 2, 8)}>
            {ad}
          </text>
        ))}
      </svg>
      <div style={{fontSize: 28, fontWeight: 700, color: C.blue, marginTop: 6, opacity: enCok}}>{T.net_note}</div>
    </>
  );
};

const S9Cta: React.FC = () => {
  const {frame, an} = useAn(S[8]);
  const nabiz = 1 + 0.035 * Math.max(0, Math.sin((frame - an(38.6)) / 6)) * ac(frame, an(38.6), 6);
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
          opacity: ac(frame, an(38.4), 10),
          scale: nabiz * interpolate(frame, [an(38.4), an(38.4) + 12], [0.7, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(2))}),
        }}
      >
        aisaasavran.com
      </div>
      <div style={{textAlign: 'center', fontSize: 32, fontWeight: 700, color: C.blue, marginTop: 24, opacity: ac(frame, an(39.0), 10)}}>{T.free}</div>
      <div style={{fontSize: 20, fontWeight: 500, color: C.muted, marginTop: 60, lineHeight: 1.4, opacity: ac(frame, 30, 12)}}>{T.disc}</div>
    </>
  );
};

// ================= ALTYAZI (seslendirmeyle kelime kelime) =================
type Grup = {kelimeler: Kelime[]; s: number; e: number};
const GRUPLAR: Grup[] = (() => {
  const g: Grup[] = [];
  let cur: Kelime[] = [];
  for (const k of K) {
    cur.push(k);
    const son = /[.,?:!]$/.test(k.w);
    if (son || cur.length >= 4) {
      g.push({kelimeler: cur, s: cur[0].s, e: cur[cur.length - 1].e});
      cur = [];
    }
  }
  if (cur.length) g.push({kelimeler: cur, s: cur[0].s, e: cur[cur.length - 1].e});
  return g;
})();

const Altyazi: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const idx = GRUPLAR.findIndex((g, i) => t >= g.s - 0.05 && t < (GRUPLAR[i + 1]?.s ?? g.e + 0.6) - 0.05);
  if (idx < 0) return null;
  const g = GRUPLAR[idx];
  const giris = interpolate(t, [g.s - 0.05, g.s + 0.12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: yumusak});
  return (
    <div
      style={{
        position: 'absolute',
        left: 80,
        width: 800,
        top: 1205,
        height: 170,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          background: 'rgba(30,22,18,0.88)',
          borderRadius: 26,
          padding: '16px 28px',
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: 50,
          lineHeight: 1.15,
          textAlign: 'center',
          maxWidth: 800,
          scale: interpolate(giris, [0, 1], [0.92, 1]),
          opacity: giris,
        }}
      >
        {g.kelimeler.map((k, i) => {
          const aktif = t >= k.s - 0.03;
          return (
            <span key={i} style={{color: aktif ? '#FFB27A' : '#FFFFFF', opacity: aktif ? 1 : 0.75}}>
              {k.w}
              {i < g.kelimeler.length - 1 ? ' ' : ''}
            </span>
          );
        })}
      </div>
    </div>
  );
};

// ================= ANA KOMPOZİSYON =================
const SAHNELER = [S1Kanca, S2Markalar, S3Yaris, S4Motorlar, S5Sorular, S6Guven, S7Shopping, S8Kaynak, S9Cta];

export const AirfryerShort: React.FC = () => {
  const {fps} = useVideoConfig();
  return (
    <AbsoluteFill>
      <Zemin />
      <Ust />
      {SAHNELER.map((Bilesen, i) => {
        const bas = S[i];
        const son = S[i + 1] ?? TOPLAM_SN;
        const sure = Math.round((son - bas) * fps);
        return (
          <Sequence key={i} name={`Sahne ${i + 1}`} from={Math.round(bas * fps)} durationInFrames={sure}>
            <Sahne sure={sure}>
              <Bilesen />
            </Sahne>
          </Sequence>
        );
      })}
      {getInputProps().kapak ? null : <Altyazi />}
      {/* Eski videoyla birebir aynı ses: Charon seslendirme + müzik (aynı karışım) */}
      <Audio src={staticFile('ses.wav')} />
    </AbsoluteFill>
  );
};
