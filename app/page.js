'use client';import {useState} from 'react';
export default function Home(){const [f,setF]=useState();const [log,setLog]=useState('');
async function up(){if(!f)return;setLog('アップロード中…');const fd=new FormData();fd.append('zip',f);const r=await fetch('/api/upload',{method:'POST',body:fd});setLog(await r.text());}
return <div style={{padding:20}}><h1>Supabase対応スターター</h1>
<input type="file" accept=".zip" onChange={e=>setF(e.target.files?.[0])}/>
<button onClick={up} disabled={!f} style={{marginLeft:10}}>アップロード</button>
<pre style={{whiteSpace:'pre-wrap',background:'#f7f7f7',padding:10}}>{log}</pre><p><a href="/map">→ マップ</a></p></div>}
