// Synthetic identities are supplied only by this local test upstream.
import { Miniflare, Response, convertV4MiniflareOptions } from 'miniflare';
import { build } from 'esbuild';
import assert from 'node:assert/strict';
const bundle = await build({ entryPoints: ['games/index.ts'], bundle: true, format: 'esm', platform: 'browser', external: ['cloudflare:workers'], write: false });
const origin = 'https://school.test';
const words = [{id:'1',hanzi:'老師',pinyin:'lǎoshī',meaning:'teacher'}, {id:'2',hanzi:'學生',pinyin:'xuéshēng',meaning:'student'}, {id:'3',hanzi:'朋友',pinyin:'péngyǒu',meaning:'friend'}];
const mf = new Miniflare(convertV4MiniflareOptions({ unsafeInspectDurableObjects:true, workers:[{ name:'games', modules:true, script:bundle.outputFiles[0].text, compatibilityDate:'2026-10-23', bindings:{APP_ORIGIN:origin}, durableObjects:{ROOMS:{className:'GameRoom',useSQLite:true}}, outboundService: async request => {
  assert.equal(new URL(request.url).origin, origin);
  const userId = request.headers.get('Authorization')?.replace('Bearer ', '');
  return Response.json({userId,lesson:0,words});
}}]}));
const sockets = [];
const delay = ms => new Promise(resolve=>setTimeout(resolve,ms));
async function post(path,user) {
 const response = await mf.dispatchFetch('https://games.test'+path,{method:'POST',headers:{Origin:origin,Authorization:'Bearer '+user,'Content-Type':'application/json'},body:JSON.stringify({name:user,lesson:0})});
 assert.equal(response.status,200,await response.clone().text()); return response.json();
}
async function connect(entry) {
 const response=await mf.dispatchFetch(`https://games.test/rooms/${entry.code}/socket`,{headers:{Origin:origin,Upgrade:'websocket','Sec-WebSocket-Protocol':`word-bomb, ticket.${entry.ticket}`}});
 assert.equal(response.status,101); const socket=response.webSocket;
 const client={socket,state:null,errors:[]};
 socket.addEventListener('message',event=>{ const message=JSON.parse(event.data); if(message.type==='state') client.state=message.state; else client.errors.push(message.error); });
 socket.accept(); sockets.push(socket); await until(()=>client.state); return client;
}
async function until(condition) { const end=Date.now()+5000; while(!condition()){assert.ok(Date.now()<end,'Timed out');await delay(20);} }
const send=(client,value)=>client.socket.send(JSON.stringify(value));
async function finish(client) {
 while(!client.state.place) {
  const state=client.state; await delay(Math.max(60,state.availableAt-Date.now()+25));
  const q=client.state.question; const meaning=words.find(word=>word.hanzi===q.hanzi).meaning;
  send(client,{type:'answer',questionId:q.id,choice:q.options.indexOf(meaning)});
  await until(()=>client.state.question?.id!==q.id || client.state.place);
 }
}
try {
 const first=await post('/rooms','alice'); const a=await connect(first);
 const b=await connect(await post('/rooms/'+first.code,'bob'));
 await until(()=>a.state.players.length===2);
 send(a,{type:'ready',ready:true});send(b,{type:'ready',ready:true});
 await until(()=>a.state.players.every(player=>player.ready)); await delay(60);
 send(a,{type:'start'});await until(()=>b.state.phase==='race');
 assert.equal(a.state.startedAt,b.state.startedAt);
 await finish(a);await until(()=>a.state.watching==='bob');
 assert.equal(a.state.phase,'race');assert.equal(a.state.place,1);assert.equal(b.state.place,null);
 // Eviction preserves connected sockets, snapshots and finish order.
 await mf.unsafeEvictDurableObject('games','GameRoom',{name:first.code,webSockets:'hibernate'});
 await delay(70);send(a,{type:'watch',playerId:'bob'});await delay(100);
 assert.equal(a.state.watching,'bob');
 b.socket.close(1000);await delay(100);
 const rejoined=await connect(await post('/rooms/'+first.code,'bob'));
 assert.equal(rejoined.state.phase,'race');assert.equal(rejoined.state.players.find(p=>p.id==='alice').place,1);
 // A wrong answer remains queued and is restored over reconnect.
 await delay(Math.max(60,rejoined.state.availableAt-Date.now()+20));
 const q=rejoined.state.question; const correct=q.options.indexOf(words.find(w=>w.hanzi===q.hanzi).meaning);
 send(rejoined,{type:'answer',questionId:q.id,choice:(correct+1)%3});
 await until(()=>rejoined.state.feedback?.correct===false);
 assert.equal(rejoined.state.players.find(p=>p.id==='bob').cleared,0);
 await finish(rejoined);await until(()=>a.state.phase==='results');
 assert.equal(rejoined.state.place,2);await delay(70);send(a,{type:'rematch'});await until(()=>a.state.phase==='lobby');
 assert.ok(a.state.players.every(p=>p.cleared===0&&!p.ready));await delay(60);
 send(a,{type:'ready',ready:true});send(rejoined,{type:'ready',ready:true});
 await until(()=>a.state.players.every(p=>p.ready));await delay(60);send(a,{type:'start'});
 await until(()=>a.state.phase==='race');
 const storage=await mf.unsafeGetDurableObjectStorage('games','GameRoom',{name:first.code});
 await storage.exec("UPDATE state SET data=json_set(data,'$.deadline',?) WHERE id=1",Date.now()-1);
 await delay(60);send(a,{type:'watch',playerId:'bob'});await until(()=>a.state.phase==='results');
 assert.ok(a.state.players.every(p=>p.forfeited));
 const replay=await mf.dispatchFetch(`https://games.test/rooms/${first.code}/socket`,{headers:{Origin:origin,Upgrade:'websocket','Sec-WebSocket-Protocol':`word-bomb, ticket.${first.ticket}`}});
 assert.equal(replay.status,401);
 const denied=await mf.dispatchFetch('https://games.test/rooms',{method:'POST',headers:{Origin:'https://evil.test'}});assert.equal(denied.status,403);
 console.log('PASS: real SQLite DO, two sockets, start, wrong retry, winner spectates, hibernation, reconnect, results, rematch, deadline, ticket replay and origin rejection');
 assert.deepEqual(a.errors,[]); assert.deepEqual(rejoined.errors,[]);
} finally {for(const socket of sockets) try{socket.close(1000);}catch{ /* Already closed. */ } await mf.dispose();}
