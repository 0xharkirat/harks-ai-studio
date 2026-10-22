// The For Curious Beings scene library. Import everything from here.
export * from './core/theme';
export {FONT} from './core/fonts';
export {ThemeRoot, useTheme, pickTheme, useBoilIndex} from './core/ThemeContext';
export {useLayout, computeLayout, FrameReserve, type Layout, type Rect} from './core/layout';
export {ROLES, MIN_WIDE, MIN_TALL, roleSizes, makeType, useType, type Role, type TypeScale} from './core/type';
export {Boil, Surface, Grain} from './core/paper';
export {Txt, Plate, LeaderLine, plateSize, type PlateLine} from './core/ui';
export {BoatBadge, QuestionBadge, LockBrackets, PinDot} from './core/marks';
export {at, clamp01, lerp, win, wave, hash} from './core/motion';
export {measureText, wrapText, balanceText} from './core/measure';

export {TitleCard} from './scenes/TitleCard';
export {NumberReveal} from './scenes/NumberReveal';
export {WorldMap, type WorldMapProps, type MapTimeline, type ClosestApproach} from './scenes/WorldMap';
export {GlobeRoute} from './scenes/GlobeRoute';
export {LeaderLabel, placeLabel} from './scenes/LeaderLabel';
export {OrbitDiagram, R_EARTH_KM, type OrbitSpec, type FlybySpec} from './scenes/OrbitDiagram';
export {Chart, type ChartProps, type BarDatum, type ScatterPoint} from './scenes/Chart';
export {Guide, GuideSlot, EMOTIONS, type Emotion, type GuideMoment} from './scenes/Guide';
export {ChannelMark} from './scenes/ChannelMark';
export {Headline} from './scenes/Headline';

export {distanceKm, makeRoute, destination, fmtKm, fmtInt, R_EARTH, type LonLat, type RouteSpec} from './geo/geo';
