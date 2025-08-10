import { XMLParser } from 'fast-xml-parser';
export function parseGPX(x){const p=new XMLParser({ignoreAttributes:false,attributeNamePrefix:'@_'});const xml=p.parse(x);
const g=xml.gpx||xml.gpx11||xml;const arr=Array.isArray(g.trk)?g.trk:(g.trk?[g.trk]:[]);const out=[];
for(const trk of arr){const segs=Array.isArray(trk.trkseg)?trk.trkseg:(trk.trkseg?[trk.trkseg]:[]);
for(const seg of segs){const pts=Array.isArray(seg.trkpt)?seg.trkpt:(seg.trkpt?[seg.trkpt]:[]);const c=[];
for(const pt of pts){const lat=parseFloat(pt['@_lat']),lon=parseFloat(pt['@_lon']);if(Number.isFinite(lat)&&Number.isFinite(lon))c.push([lon,lat]);}if(c.length>1)out.push(c);}}return out;}
export function parseTCX(x){const p=new XMLParser({ignoreAttributes:false,attributeNamePrefix:'@_'});const xml=p.parse(x);
const acts=xml.TrainingCenterDatabase?.Activities?.Activity;const A=Array.isArray(acts)?acts:(acts?[acts]:[]);const out=[];
for(const a of A){const laps=Array.isArray(a.Lap)?a.Lap:(a.Lap?[a.Lap]:[]);
for(const lap of laps){const tps=Array.isArray(lap.Track?.Trackpoint)?lap.Track.Trackpoint:(lap.Track?.Trackpoint?[lap.Track.Trackpoint]:[]);const c=[];
for(const tp of tps){const pos=tp.Position;if(pos&&pos.LatitudeDegrees!=null&&pos.LongitudeDegrees!=null){c.push([parseFloat(pos.LongitudeDegrees),parseFloat(pos.LatitudeDegrees)]);}}
if(c.length>1)out.push(c);}}return out;}
