'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: true }
});

export default function Home() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [file, setFile] = useState(null);
  const [log, setLog] = useState('');

  useEffect(() => {
    supa.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supa.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signUp() {
    const { error } = await supa.auth.signUp({ email, password: pass });
    setLog(error ? 'サインアップ失敗: ' + error.message : 'サインアップ完了。確認メールをチェックしてください。');
  }
  async function signIn() {
    const { error } = await supa.auth.signInWithPassword({ email, password: pass });
    setLog(error ? 'ログイン失敗: ' + error.message : 'ログイン成功');
  }
  async function signOut() { await supa.auth.signOut(); }

  async function handleUpload() {
    if (!file) return;
    setLog('アップロード中…');
    const { data: sess } = await supa.auth.getSession();
    const token = sess?.session?.access_token;
    if (!token) { setLog('ログインが必要です'); return; }

    const fd = new FormData();
    fd.append('gpx', file);
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd
    });
    const txt = await res.text();
    setLog(txt + '\n→ 下の「マップ」を開いてください。');
  }

  if (!session) {
    return (
      <main style={{ padding: 20, maxWidth: 520 }}>
        <h1>CUCCせんつなぎ（仮）</h1>
        <p>メールとパスワードでサインインしてください。</p>
        <div style={{ display:'grid', gap:8, margin:'12px 0' }}>
          <input placeholder="メールアドレス" value={email} onChange={e=>setEmail(e.target.value)} />
          <input placeholder="パスワード" type="password" value={pass} onChange={e=>setPass(e.target.value)} />
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={signIn}>ログイン</button>
            <button onClick={signUp}>新規登録</button>
          </div>
        </div>
        <pre style={{ whiteSpace:'pre-wrap', background:'#f7f7f7', padding:10 }}>{log}</pre>
      </main>
    );
  }

  return (
    <main style={{ padding: 20 }}>
      <h1>CUCCせんつなぎ（仮）</h1>
      <p>GPXファイルのみアップロードできます（ZIPやTCXは不可）。</p>
      <input
        type="file"
        accept=".gpx,application/gpx+xml,application/octet-stream"
        onChange={e=>setFile(e.target.files?.[0]||null)}
      />
      <button onClick={handleUpload} disabled={!file} style={{ marginLeft: 10 }}>アップロード</button>
      <button onClick={signOut} style={{ marginLeft: 12 }}>ログアウト</button>
      <pre style={{ whiteSpace:'pre-wrap', background:'#f7f7f7', padding:10, marginTop:10 }}>{log}</pre>
      <hr />
      <p><a href="/map">→ マップ</a></p>
    </main>
  );
}
