// Instagram karusel sayfası (1080x1350): sahnelerin son hâli, alt şeritte site + sayfa no.
import React from 'react';
import {AbsoluteFill, useVideoConfig} from 'remotion';
import {SAHNE_TURU} from './sahneler';
import {C, FONT, L, Ust, VeriCtx, Zemin, hazirla} from './ortak';
import {ShortProps} from './Short';

export const KART_VARSAYILAN = ['s1', 's2', 's3', 'shop', 'net'];

export const Kart: React.FC<ShortProps & {sayfa: number}> = ({ayar, kel, dil, sayfa}) => {
  const {fps} = useVideoConfig();
  const sayfalar: string[] = ayar.rm?.kart ?? KART_VARSAYILAN;
  const tur = sayfalar[sayfa - 1];
  const i = (ayar.order as string[]).indexOf(tur);
  const Bilesen = SAHNE_TURU[tur];
  const v = React.useMemo(() => {
    const h = hazirla(ayar, kel!, dil, true);
    const son = h.bas[i + 1] ?? h.sure;
    return {...h, sabit: Math.round((son - h.bas[i]) * fps) - 8};
  }, [ayar, kel, dil, i, fps]);
  return (
    <VeriCtx.Provider value={v}>
      <AbsoluteFill>
        <Zemin />
        <Ust top={64} />
        <div style={{position: 'absolute', left: 80, top: 170, width: 800, height: 1000, fontFamily: FONT, color: C.ink}}>
          <Bilesen i={i} />
        </div>
        <div
          style={{
            position: 'absolute',
            left: 80,
            right: 80,
            bottom: 56,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontFamily: FONT,
            fontSize: 30,
            fontWeight: 800,
          }}
        >
          <div style={{color: C.orange}}>aisaasavran.com</div>
          <div style={{color: C.muted}}>
            {sayfa}/{sayfalar.length}
            {sayfa < sayfalar.length ? `  ·  ${L[dil].kaydir}` : ''}
          </div>
        </div>
      </AbsoluteFill>
    </VeriCtx.Provider>
  );
};
