import { NextResponse } from 'next/server';import { supaAdmin } from '../../../lib/supa.js';
export const runtime='nodejs';
export async function GET(req){const url=new URL(req.url);const b=url.searchParams.get('bbox');const z=parseInt(url.searchParams.get('z')||'8',10);
if(!b)return NextResponse.json({type:'FeatureCollection',features:[]});const [w,s,e,n]=b.split(',').map(Number);const lod=z>=12?'hi':(z>=9?'mid':'low');
const sba=supaAdmin();const { data:rows } = await sba.from('track_meta').select('id,w,e,s,n').gt('e',w).lt('w',e).gt('n',s).lt('s',n).limit(3000);
if(!rows?.length)return NextResponse.json({type:'FeatureCollection',features:[]});
const files=await Promise.all(rows.map(r=>sba.storage.from('tracks').download(`${r.id}-${lod}.json`)));
const feats=[];for(const f of files){if(f.data){const t=await f.data.text();try{feats.push(JSON.parse(t))}catch{}}}
return NextResponse.json({type:'FeatureCollection',features:feats});}
