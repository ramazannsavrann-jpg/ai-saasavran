// Veri Shorts'u: ayar.json "order" sırasıyla sahneler, kelime kelime altyazı, hazır ses karışımı.
import React from 'react';
import {AbsoluteFill, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import {SAHNE_TURU} from './sahneler';
import {Ayar, FONT, Kelime, Ust, VeriCtx, Zemin, ac, cumleBas, hazirla, useVeri, yumusak} from './ortak';

export type ShortProps = {ad: string; dil: 'tr' | 'en'; ayar?: Ayar; kel?: Kelime[]};

// Sahne kabı: içerik güvenli alanda (x 80–880, y 280–1160); altyazı bandı 1205–1375
const Kap: React.FC<{children: React.ReactNode; sure: number; gecis: boolean}> = ({children, sure, gecis}) => {
  const frame = useCurrentFrame();
  const giris = gecis ? ac(frame, 0, 10) : 1;
  const cikis = gecis ? interpolate(frame, [sure - 6, sure], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 1;
  return (
    <AbsoluteFill style={{opacity: Math.min(giris, cikis)}}>
      <div style={{position: 'absolute', left: 80, top: 280, width: 800, height: 880, translate: `0px ${(1 - giris) * 40}px`, fontFamily: FONT, color: '#1E1612'}}>
        {children}
      </div>
    </AbsoluteFill>
  );
};

type Grup = {k: Kelime[]; s: number; e: number};
const gruplaAltyazi = (kel: Kelime[]): Grup[] => {
  const g: Grup[] = [];
  let cur: Kelime[] = [];
  for (const k of kel) {
    cur.push(k);
    // Noktalamada böl (ama "5." gibi sıra sayısında bölme)
    const son = /[,?:!;]$/.test(k.w) || (/\.$/.test(k.w) && !/^\d+\.$/.test(k.w));
    if (son || cur.length >= 4) {
      g.push({k: cur, s: cur[0].s, e: cur[cur.length - 1].e});
      cur = [];
    }
  }
  if (cur.length) g.push({k: cur, s: cur[0].s, e: cur[cur.length - 1].e});
  return g;
};

const Altyazi: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const v = useVeri();
  const gruplar = React.useMemo(() => gruplaAltyazi(v.kel), [v.kel]);
  const t = frame / fps;
  const idx = gruplar.findIndex((g, i) => t >= g.s - 0.05 && t < (gruplar[i + 1]?.s ?? g.e + 0.6) - 0.05);
  if (idx < 0) return null;
  const g = gruplar[idx];
  const giris = interpolate(t, [g.s - 0.05, g.s + 0.12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: yumusak});
  return (
    <div style={{position: 'absolute', left: 80, width: 800, top: 1205, height: 170, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
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
        {g.k.map((k, i) => {
          const aktif = t >= k.s - 0.03;
          return (
            <span key={i} style={{color: aktif ? '#FFB27A' : '#FFFFFF', opacity: aktif ? 1 : 0.75}}>
              {k.w}
              {i < g.k.length - 1 ? ' ' : ''}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export const Short: React.FC<ShortProps> = ({ayar, kel, dil, ad}) => {
  const {fps} = useVideoConfig();
  const v = React.useMemo(() => hazirla(ayar, kel!, dil), [ayar, kel, dil]);
  const order: string[] = ayar.order;
  return (
    <VeriCtx.Provider value={v}>
      <AbsoluteFill>
        <Zemin />
        <Ust />
        {order.map((tur, i) => {
          const Bilesen = SAHNE_TURU[tur];
          const bas = v.bas[i];
          const son = v.bas[i + 1] ?? v.sure;
          const sure = Math.round((son - bas) * fps);
          return (
            <Sequence key={i} name={`${i + 1}. ${tur}`} from={Math.round(bas * fps)} durationInFrames={sure}>
              <Kap sure={sure} gecis>
                <Bilesen i={i} />
              </Kap>
            </Sequence>
          );
        })}
        <Altyazi />
        {/* İlk kare = kapak: Instagram Reels kapağı otomatik ilk kareden alır (API kapak seçtirmiyor) */}
        <Sequence from={0} durationInFrames={1} name="Kapak karesi">
          <Kapak ad={ad} dil={dil} ayar={ayar} kel={kel} />
        </Sequence>
        <Audio src={staticFile(`${ad}/ses.wav`)} />
      </AbsoluteFill>
    </VeriCtx.Provider>
  );
};

// Kapak: ilk sahnenin son hâli (altyazısız, geçişsiz)
export const Kapak: React.FC<ShortProps> = ({ayar, kel, dil}) => {
  const {fps} = useVideoConfig();
  const i = ayar.rm?.kapak_sahne ?? 0;
  const v = React.useMemo(() => {
    const h = hazirla(ayar, kel!, dil, true);
    const g = h.gruplar[i];
    return {...h, sabit: Math.round((cumleBas(h, g[g.length - 1]) - h.bas[i] + 1.2) * fps)};
  }, [ayar, kel, dil, i, fps]);
  const Bilesen = SAHNE_TURU[ayar.order[i] as string];
  return (
    <VeriCtx.Provider value={v}>
      <AbsoluteFill>
        <Zemin />
        <Ust />
        <Kap sure={99999} gecis={false}>
          <Bilesen i={i} />
        </Kap>
      </AbsoluteFill>
    </VeriCtx.Provider>
  );
};
