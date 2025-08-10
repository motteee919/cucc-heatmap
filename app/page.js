'use client';
import { useState } from 'react';
import JSZip from 'jszip';

export default function Home() {
  const [file, setFile] = useState(null);
  const [log, setLog] = useState('');
  const [extractOnlyGPX, setExtractOnlyGPX] = useState(true); // ← 追加

  async function handleUpload() {
    if (!file) return;
    setLog('準備中…');

    let blobToSend = file;

    try {
      if (extractOnlyGPX) {
        // ZIPを読み込み→.gpx（必要なら.tcxも）だけ抜き出して新ZIPへ
        setLog('ZIPを解析してGPXだけ抽出中…');
        const inZip = await JSZip.loadAsync(file);
        const outZip = new JSZip();
        let kept = 0, skipped = 0;

        // .gpx と .tcx のどちらを残すかはここで調整できる
        const keepExts = ['.gpx']; // 例：['.gpx', '.tcx'] とすればTCXも残す

        await Promise.all(
          Object.keys(inZip.files).map(async (name) => {
            const lower = name.toLowerCase();
            const isKeep = keepExts.some(ext => lower.endsWith(ext));
            if (!isKeep) { skipped++; return; }
            const txt = await inZip.files[name].async('string');
            outZip.file(name.split('/').pop(), txt); // フラットに格納
            kept++;
          })
        );

        if (kept === 0) {
          setLog('ZIPの中にGPXが見つかりませんでした。元のZIPをそのまま送ります。');
        } else {
          setLog(`GPX抽出完了：${kept}件（スキップ${skipped}）→ 再圧縮中…`);
          const newZipBlob = await outZip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
          blobToSend = new File([newZipBlob], 'gpx-only.zip', { type: 'application/zip' });
        }
      }

      setLog('アップロード中…');
      const fd = new FormData();
      fd.append('zip', blobToSend);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const txt = await res.text();
      setLog(txt + '\n→ 下の「マップ」を開いてください。');
    } catch (e) {
      console.error(e);
      setLog('エラー: ' + e.message);
    }
  }

  return (
    <div style={{padding:20}}>
      <h1>Supabase対応スターター</h1>
      <p>Stravaの<strong>一括エクスポートZIP</strong>を選んでください。</p>

      <div style={{margin:'8px 0'}}>
        <label style={{display:'inline-flex',alignItems:'center',gap:8}}>
          <input
            type="checkbox"
            checked={extractOnlyGPX}
            onChange={e=>setExtractOnlyGPX(e.target.checked)}
          />
          GPXだけ抽出してからアップロード（通信量・処理時間が減ります）
        </label>
      </div>

      <input type="file" accept=".zip" onChange={e=>setFile(e.target.files?.[0]||null)} />
      <button onClick={handleUpload} disabled={!file} style={{marginLeft:10}}>アップロード</button>

      <pre style={{whiteSpace:'pre-wrap', background:'#f7f7f7', padding:10, marginTop:10}}>{log}</pre>
      <hr/>
      <p><a href="/map">→ マップ</a></p>
    </div>
  );
}
