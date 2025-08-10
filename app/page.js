'use client';
import { useState } from 'react';
import JSZip from 'jszip';

export default function Home() {
  const [files, setFiles] = useState([]);
  const [log, setLog] = useState('');

  async function handleUpload() {
    if (files.length === 0) return;

    setLog('準備中…');

    for (const file of files) {
      let blobToSend = file;
      const name = file.name.toLowerCase();

      // ZIPの場合は中からGPXだけ抽出
      if (name.endsWith('.zip')) {
        try {
          setLog(`ZIP解析中: ${file.name}`);
          const inZip = await JSZip.loadAsync(file);
          const outZip = new JSZip();
          let kept = 0;

          for (const fname of Object.keys(inZip.files)) {
            if (fname.toLowerCase().endsWith('.gpx') || fname.toLowerCase().endsWith('.tcx')) {
              const content = await inZip.files[fname].async('string');
              outZip.file(fname.split('/').pop(), content);
              kept++;
            }
          }

          if (kept > 0) {
            const newZipBlob = await outZip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
            blobToSend = new File([newZipBlob], 'gpx-only.zip', { type: 'application/zip' });
            setLog(`GPX/TCXを${kept}件抽出 → 再圧縮完了`);
          } else {
            setLog(`GPX/TCXが見つかりませんでした → ZIPそのまま送信`);
          }
        } catch (err) {
          console.error(err);
          setLog(`ZIP解析エラー: ${err.message}`);
        }
      }

      // サーバーへ送信
      const fd = new FormData();
      fd.append('zip', blobToSend);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const txt = await res.text();
      setLog(prev => prev + `\n${file.name} → ${txt}`);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>GPX/ZIPアップローダー</h1>
      <input
        type="file"
        accept=".zip,.gpx,.tcx,application/zip,application/gpx+xml,application/octet-stream"
        multiple
        onChange={e => setFiles(Array.from(e.target.files))}
      />
      <button onClick={handleUpload} disabled={files.length === 0} style={{ marginLeft: 10 }}>
        アップロード
      </button>
      <pre style={{ whiteSpace: 'pre-wrap', background: '#f7f7f7', padding: 10, marginTop: 10 }}>
        {log}
      </pre>
      <hr />
      <p><a href="/map">→ マップを見る</a></p>
    </div>
  );
}
