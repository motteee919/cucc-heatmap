import { NextResponse } from 'next/server';
import AdmZip from 'adm-zip';
import { supaAdmin, parseGPX, parseTCX, coordsToFeature, flushBatch } from '@/lib/utils';

export async function POST(req) {
  try {
    const fd = await req.formData();
    const file = fd.get('zip');
    if (!file) return NextResponse.text('ファイルがありません', { status: 400 });

    const buf = Buffer.from(await file.arrayBuffer());
    const name = (file.name || '').toLowerCase();
    const supa = supaAdmin();
    const heat = new Map();
    let parsed = 0, stored = 0, id = 0;
    const batch = [];

    if (name.endsWith('.zip')) {
      // ZIPを展開してGPX/TCXだけ処理
      const zip = new AdmZip(buf);
      const entries = zip.getEntries();
      for (const e of entries) {
        if (!e.name.toLowerCase().endsWith('.gpx') && !e.name.toLowerCase().endsWith('.tcx')) continue;
        const xml = e.getData().toString('utf-8');
        const tracks = e.name.toLowerCase().endsWith('.gpx') ? parseGPX(xml) : parseTCX(xml);
        for (const coords of tracks) {
          if (coords.length < 2) continue;
          batch.push(coordsToFeature(coords));
          parsed++;
          if (batch.length >= 50) { const r = await flushBatch(batch, supa, heat, id); id += r.stored; stored += r.stored; }
        }
      }
    } else {
      // GPX/TCX単体
      const xml = buf.toString('utf-8');
      const tracks = name.endsWith('.tcx') ? parseTCX(xml) : parseGPX(xml);
      for (const coords of tracks) {
        if (coords.length < 2) continue;
        batch.push(coordsToFeature(coords));
        parsed++;
        if (batch.length >= 50) { const r = await flushBatch(batch, supa, heat, id); id += r.stored; stored += r.stored; }
      }
    }

    if (batch.length > 0) {
      const r = await flushBatch(batch, supa, heat, id);
      stored += r.stored;
    }

    return NextResponse.text(`解析${parsed}件 → 保存${stored}件`);
  } catch (err) {
    console.error(err);
    return NextResponse.text(`エラー: ${err.message}`, { status: 500 });
  }
}
