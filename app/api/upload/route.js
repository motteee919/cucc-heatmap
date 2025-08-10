import { NextResponse } from 'next/server';
import { supaAdmin, getUserFromRequest } from '../../../lib/supa.js';
import { XMLParser } from 'fast-xml-parser';
import * as turf from '@turf/turf';
import * as h3 from 'h3-js';

export const runtime = 'nodejs';

// 既存スターターの簡略化値（LOD）
const TOLS = { low: 0.01, mid: 0.003, hi: 0.0008 };

function parseGPX(xmlStr) {
  const p = new XMLParser({ ignoreAttributes:false, attributeNamePrefix:'@_' });
  const xml = p.parse(xmlStr);
  const gpx = xml.gpx || xml.gpx11 || xml;
  const tracks = Array.isArray(gpx.trk) ? gpx.trk : (gpx.trk ? [gpx.trk] : []);
  const out = [];
  for (const trk of tracks) {
    const segs = Array.isArray(trk.trkseg) ? trk.trkseg : (trk.trkseg ? [trk.trkseg] : []);
    for (const seg of segs) {
      const pts = Array.isArray(seg.trkpt) ? seg.trkpt : (seg.trkpt ? [seg.trkpt] : []);
      const coords = [];
      for (const pt of pts) {
        const lat = parseFloat(pt['@_lat']); const lon = parseFloat(pt['@_lon']);
        if (Number.isFinite(lat) && Number.isFinite(lon)) coords.push([lon, lat]);
      }
      if (coords.length > 1) out.push(coords);
    }
  }
  return out;
}
const toFeature = (coords) => ({ type:'Feature', properties:{}, geometry:{ type:'LineString', coordinates:coords } });
const simp = (f,t) => turf.simplify(f, { tolerance:t, highQuality:false });
const bbox = (f) => turf.bbox(f);
function lineToH3(f,res=7){ const S=new Set(); for(const [lon,lat] of f.geometry.coordinates){ S.add(h3.latLngToCell(lat,lon,res)); } return [...S]; }

export async function POST(req) {
  // 1) 認証チェック
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.text('Unauthorized', { status: 401 });

  try {
    const fd = await req.formData();
    const file = fd.get('gpx');
    if (!file) return NextResponse.text('gpxファイルがありません', { status: 400 });
    const name = (file.name || '').toLowerCase();
    if (!name.endsWith('.gpx')) return NextResponse.text('GPXのみ受け付けます', { status: 400 });

    const raw = Buffer.from(await file.arrayBuffer());
    const xml = raw.toString('utf-8');

    // 2) 解析
    const tracks = parseGPX(xml);
    if (!tracks.length) return NextResponse.text('GPXにトラックが見つかりません', { status: 400 });

    const supa = supaAdmin();

    // 3) オリジナルGPXを保持（tracks/original/ユーザーID/タイムスタンプ.gpx）
    const stamp = Date.now();
    await supa.storage.from('tracks').upload(
      `original/${user.id}/${stamp}-${file.name}`,
      new Blob([raw], { type:'application/gpx+xml' }),
      { upsert:true }
    );

    // 4) LOD作成＆保存＋BBox登録＋ヒート集計
    const heat = new Map();
    let saved = 0;
    for (const coords of tracks) {
      const f = toFeature(coords);
      const low = simp(f, TOLS.low), mid = simp(f, TOLS.mid), hi = simp(f, TOLS.hi);
      const [w,s,e,n] = bbox(low);
      const trackId = `${user.id}-${stamp}-${saved+1}`;

      await supa.storage.from('tracks').upload(`${trackId}-low.json`, new Blob([JSON.stringify(low)], { type:'application/json' }), { upsert:true });
      await supa.storage.from('tracks').upload(`${trackId}-mid.json`, new Blob([JSON.stringify(mid)], { type:'application/json' }), { upsert:true });
      await supa.storage.from('tracks').upload(`${trackId}-hi.json`,  new Blob([JSON.stringify(hi)],  { type:'application/json' }), { upsert:true });

      await supa.from('track_meta').insert({ trackId, w, e, s, n }); // 既存テーブルにid列が無ければbigserialとは別にtext型id列を追加推奨

      for (const c of lineToH3(low,7)) heat.set(c, (heat.get(c)||0)+1);
      saved++;
    }

    // 5) ヒートを書き戻し（全体で1枚を更新する簡易版）
    // 既存のheat-res7.jsonを読み→マージ→保存、でもOK。ここは上書きでもまず運用可。
    const heatFC = {
      type:'FeatureCollection',
      features: Array.from(heat.entries()).map(([cell,count]) => {
        const boundary = h3.cellToBoundary(cell, true).map(([lat,lon]) => [lon,lat]);
        return { type:'Feature', properties:{ cell, count }, geometry:{ type:'Polygon', coordinates:[boundary.concat([boundary[0]])] } };
      })
    };
    await supa.storage.from('indexes').upload('heat-res7.json', new Blob([JSON.stringify(heatFC)], { type:'application/json' }), { upsert:true });

    return NextResponse.text(`OK: 受領GPX=${file.name} / 保存${saved}セグメント（オリジナル保持済み）`);
  } catch (e) {
    console.error(e);
    return NextResponse.text('サーバエラー: ' + e.message, { status: 500 });
  }
}
