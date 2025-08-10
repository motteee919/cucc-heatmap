import { NextResponse } from 'next/server';import AdmZip from 'adm-zip';
import { supaAdmin } from '../../../lib/supa.js';import { parseGPX,parseTCX } from '../../../lib/parse_gpx_tcx.js';
import { coordsToFeature as F,simp,bbox,cells,heatFC,TOLS } from '../../../lib/geo.js';
export const runtime='nodejs';
export async function POST(req){try{const fd=await req.formData();const file=fd.get('zip');if(!file)return NextResponse.text('zipなし',{status:400});
const buf=Buffer.from(await file.arrayBuffer());const zip=new AdmZip(buf);const ents=zip.getEntries();const supa=supaAdmin();
let parsed=0,skipped=0;const heat=new Map();let nextId=0;
const batch=[];for(const e of ents){if(e.isDirectory)continue;const ext=e.entryName.slice(e.entryName.lastIndexOf('.')).toLowerCase();
if(ext!=='.gpx'&&ext!=='.tcx'){skipped++;continue}const xml=e.getData().toString('utf-8');const arr=(ext==='.gpx')?parseGPX(xml):parseTCX(xml);
for(const coords of arr){if(coords.length<2)continue;batch.push(F(coords));parsed++;if(batch.length>=50){nextId+=await flush(batch,supa,heat,nextId);}}}
if(batch.length){nextId+=await flush(batch,supa,heat,nextId);}const heatJson=heatFC(heat);
await supa.storage.from('indexes').upload('heat-res7.json',new Blob([JSON.stringify(heatJson)],{type:'application/json'}),{upsert:true});
return NextResponse.text(`OK parsed=${parsed} skip=${skipped} saved=${nextId}`);}catch(e){return NextResponse.text('err:'+e.message,{status:500});}}
async function flush(batch,supa,heat,start){let saved=0;while(batch.length){const f=batch.shift();const low=simp(f,TOLS.low),mid=simp(f,TOLS.mid),hi=simp(f,TOLS.hi);
const bb=bbox(low);const w=bb[0],s=bb[1],e=bb[2],n=bb[3];const id=start+saved+1;
await supa.storage.from('tracks').upload(`${id}-low.json`,new Blob([JSON.stringify(low)],{type:'application/json'}),{upsert:true});
await supa.storage.from('tracks').upload(`${id}-mid.json`,new Blob([JSON.stringify(mid)],{type:'application/json'}),{upsert:true});
await supa.storage.from('tracks').upload(`${id}-hi.json`, new Blob([JSON.stringify(hi)], {type:'application/json'}),{upsert:true});
await supa.from('track_meta').insert({w,e,s,n});for(const c of cells(low,7))heat.set(c,(heat.get(c)||0)+1);saved++;}return saved;}
