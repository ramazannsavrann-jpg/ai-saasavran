import {Composition} from 'remotion';
import {AirfryerShort, TOPLAM_SN} from './AirfryerShort';

export const RemotionRoot = () => {
  return (
    <Composition
      id="AirfryerTR"
      component={AirfryerShort}
      durationInFrames={Math.round(TOPLAM_SN * 30)}
      fps={30}
      width={1080}
      height={1920}
    />
  );
};
