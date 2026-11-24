// Ortak parçalar: tema, yazı tipi, zamanlama (seslendirmedeki kelimelere bağlı), küçük bileşenler.
import React, {createContext, useContext} from 'react';
import {AbsoluteFill, Easing, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont} from '@remotion/fonts';

for (const [w, f] of [
  ['500', 'Inter-Medium.otf'],
  ['600', 'Inter-SemiBold.otf'],
  ['700', 'Inter-Bold.otf'],
  ['800', 'Inter-ExtraBold.otf'],
  ['900', 'Inter-Black.otf'],
] as const) {
  loadFont({family: 'Inter', url: staticFile(f), weight: w});
}

// "Sıcak Hava" teması (airfryer/TASARIM.md). Yeni konuya yeni tema gerekirse buraya eklenir.
export const C = {
  bg1: '#FFF6EC',
  bg2: '#FFE7D1',
  ink: '#1E1612',
  muted: '#7A6A5E',
  orange: '#E8541C',
  blue: '#1F5FBF',
  gold: '#B86E00',
  red: '#C8283C',
  card: '#FFFFFF',
  hl: '#FFD2AC',
  barBg: '#F4DECA',
};
export const MOTOR_RENK: Record<string, string> = {
  ChatGPT: '#10785A',
  Claude: '#C45A28',
  Perplexity: '#1F5FBF',
  Gemini: '#963CA0',
};
export const FONT = 'Inter, sans-serif';

// Dil bazlı sabit yazılar (konuya özel yazılar ayar.json "t" ve "rm" içinde)
export const L = {
  tr: {olcum: 'Ölçüm', canliMotor: 'canlı aramalı yapay zekâ', aliciSorusu: 'alıcı sorusu', canliArama: 'canlı arama', kaydir: 'Kaydır →'},
  en: {olcum: 'Measured', canliMotor: 'live-search AIs', aliciSorusu: 'buyer questions', canliArama: 'live search', kaydir: 'Swipe →'},
};

export type Kelime = {w: string; s: number; e: number; c: number};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Ayar = any;

export type Veri = {
  ayar: Ayar;
  kel: Kelime[];
  dil: 'tr' | 'en';
  gruplar: number[][]; // sahne -> cümle numaraları
  bas: number[]; // sahne başlangıçları (sn)
  sure: number; // toplam (sn)
  kapak: boolean; // kapak/kart çiziminde altyazı ve geçiş yok
  sabit?: number; // kapak/kart: sahne bu karede sabit çizilir
};

export const VeriCtx = createContext<Veri | null>(null);
export const useVeri = () => {
  const v = useContext(VeriCtx);
  if (!v) throw new Error('VeriCtx yok');
  return v;
};

// Seslendirmeden türetilen zamanlama
export const hazirla = (ayar: Ayar, kel: Kelime[], dil: 'tr' | 'en', kapak = false): Veri => {
  const gruplar: number[][] = String(ayar.gruplar)
    .split('|')
    .map((g) => g.split(',').map(Number));
  const cBas = (c: number) => kel.find((k) => k.c === c)?.s ?? 0;
  const bas = gruplar.map((g, i) => (i === 0 ? 0 : Math.max(0, cBas(g[0]) - 0.28)));
  const sure = Math.round((kel[kel.length - 1].e + 2.6) * 10) / 10;
  return {ayar, kel, dil, gruplar, bas, sure, kapak};
};

// Bir cümlenin başladığı / bittiği an
export const cumleBas = (v: Veri, c: number) => v.kel.find((k) => k.c === c)?.s ?? 0;
export const cumleSon = (v: Veri, c: number) => {
  const ks = v.kel.filter((k) => k.c === c);
  return ks.length ? ks[ks.length - 1].e : 0;
};
const sade = (s: string) => s.toLocaleLowerCase('tr').replace(/[^\p{L}\p{N}]/gu, '');
// Sahnenin cümlelerinde, verilen ifadeyle başlayan ilk kelimenin anı (yoksa yedek)
export const kelimeAn = (v: Veri, sahne: number, ifade: string, yedek: number, sonra = 0) => {
  const cs = v.gruplar[sahne];
  const aranan = sade(ifade);
  const k = v.kel.find((x) => cs.includes(x.c) && x.s >= sonra && sade(x.w).startsWith(aranan));
  return k ? k.s : yedek;
};

// Sahne içindeki kare <-> sesteki mutlak an
export const useAn = (sahne: number) => {
  const gercek = useCurrentFrame();
  const {fps} = useVideoConfig();
  const v = useVeri();
  const frame = v.sabit ?? gercek;
  const b = v.bas[sahne];
  return {frame, fps, v, an: (sn: number) => (sn - b) * fps};
};

export const yumusak = Easing.bezier(0.16, 1, 0.3, 1);
export const ac = (frame: number, bas: number, sure = 12) =>
  interpolate(frame, [bas, bas + sure], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: yumusak});
export const zipla = (frame: number, bas: number, sure: number, from: number, guc = 2) =>
  interpolate(frame, [bas, bas + sure], [from, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(guc))});

export const Sayac: React.FC<{deger: number; bas: number; sure?: number; frame: number}> = ({deger, bas, sure = 18, frame}) => (
  <>
    {Math.round(
      interpolate(frame, [bas, bas + sure], [0, deger], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)}),
    )}
  </>
);

export const Logo: React.FC<{s?: number}> = ({s = 64}) => (
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

export const Zemin: React.FC = () => {
  const frame = useCurrentFrame();
  const nefes = 0.55 + 0.1 * Math.sin(frame / 40);
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 92% 6%, rgba(255,150,80,${nefes}) 0%, rgba(255,150,80,0) 46%), linear-gradient(180deg, ${C.bg1} 0%, ${C.bg2} 100%)`,
      }}
    />
  );
};

export const Ust: React.FC<{top?: number}> = ({top = 178}) => (
  <div style={{position: 'absolute', left: 80, top, display: 'flex', alignItems: 'center', gap: 18}}>
    <Logo s={58} />
    <div>
      <div style={{fontFamily: FONT, fontWeight: 800, fontSize: 30, color: C.ink}}>AI SaaSavran</div>
      <div style={{fontFamily: FONT, fontWeight: 500, fontSize: 20, color: C.muted}}>aisaasavran.com</div>
    </div>
  </div>
);

export const Etiket: React.FC<{children: React.ReactNode; renk?: string; frame: number}> = ({children, renk = C.orange, frame}) => (
  <div
    style={{
      display: 'inline-block',
      background: renk,
      color: '#fff',
      fontWeight: 700,
      fontSize: 28,
      padding: '8px 20px',
      borderRadius: 40,
      scale: zipla(frame, 0, 10, 0.6),
    }}
  >
    {children}
  </div>
);

export const Baslik: React.FC<{children: React.ReactNode; boy?: number; frame: number; gecikme?: number}> = ({children, boy = 68, frame, gecikme = 3}) => (
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

export const Alt: React.FC<{children: React.ReactNode; frame: number; gecikme?: number}> = ({children, frame, gecikme = 8}) => (
  <div style={{fontWeight: 600, fontSize: 30, color: C.muted, marginTop: 14, lineHeight: 1.3, opacity: ac(frame, gecikme, 12)}}>{children}</div>
);
