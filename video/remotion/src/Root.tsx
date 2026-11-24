// Kompozisyonlar. Her iş public/<ad>/ içindeki ayar.json + kelimeler.json + ses.wav ile çizilir.
// Örnek: npx remotion render Short out.mp4 --props='{"ad":"airfryer-en","dil":"en"}'
import {CalculateMetadataFunction, Composition, staticFile} from 'remotion';
import {Kapak, Short, ShortProps} from './Short';
import {Kart} from './Kart';
import {hazirla} from './ortak';

const yukle: CalculateMetadataFunction<ShortProps & {sayfa?: number}> = async ({props}) => {
  const [ayar, kel] = await Promise.all([
    fetch(staticFile(`${props.ad}/ayar.json`)).then((r) => r.json()),
    fetch(staticFile(`${props.ad}/kelimeler.json`)).then((r) => r.json()),
  ]);
  const v = hazirla(ayar, kel, props.dil);
  return {props: {...props, ayar, kel}, durationInFrames: Math.round(v.sure * 30)};
};

const VARSAYILAN: ShortProps = {ad: 'airfryer-tr', dil: 'tr'};

export const RemotionRoot = () => (
  <>
    <Composition id="Short" component={Short} fps={30} width={1080} height={1920} durationInFrames={300} defaultProps={VARSAYILAN} calculateMetadata={yukle} />
    <Composition
      id="Kapak"
      component={Kapak}
      fps={30}
      width={1080}
      height={1920}
      durationInFrames={1}
      defaultProps={VARSAYILAN}
      calculateMetadata={(async (a: never) => ({...(await yukle(a)), durationInFrames: 1})) as never}
    />
    <Composition
      id="Kart"
      component={Kart}
      fps={30}
      width={1080}
      height={1350}
      durationInFrames={1}
      defaultProps={{...VARSAYILAN, sayfa: 1}}
      calculateMetadata={(async (a: never) => ({...(await yukle(a)), durationInFrames: 1})) as never}
    />
  </>
);
