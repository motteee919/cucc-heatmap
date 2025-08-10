import * as turf from '@turf/turf';import * as h3 from 'h3-js';
export const TOLS={low:0.01,mid:0.003,hi:0.0008};
export const coordsToFeature=(c)=>({type:'Feature',properties:{},geometry:{type:'LineString',coordinates:c}});
export const simp=(f,t)=>turf.simplify(f,{tolerance:t,highQuality:false});
export const bbox=(f)=>turf.bbox(f);
export function cells(f,res=7){const cs=f.geometry.coordinates;const S=new Set();for(const [lon,lat] of cs){S.add(h3.latLngToCell(lat,lon,res));}return [...S];}
export function heatFC(M){const feats=[];for(const [cell,count] of M.entries()){const bd=h3.cellToBoundary(cell,true).map(([lat,lon])=>[lon,lat]);feats.push({type:'Feature',properties:{cell,count},geometry:{type:'Polygon',coordinates:[bd.concat([bd[0]])]}});}return {type:'FeatureCollection',features:feats};}
