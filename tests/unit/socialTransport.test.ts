import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { build } from 'esbuild';

class FakeSocket {
  static OPEN=1; static CONNECTING=0;
  static instances: FakeSocket[]=[];
  readyState=0;
  bufferedAmount=0;
  sent:string[]=[];
  onopen:(()=>void)|null=null;
  onmessage:((event:{data:string})=>void)|null=null;
  onclose:((event:{code:number;reason:string})=>void)|null=null;
  constructor(readonly url:string,readonly protocols:string[]){FakeSocket.instances.push(this);}
  open(){this.readyState=1;this.onopen?.();}
  message(data:string){this.onmessage?.({data});}
  send(data:string){if(this.readyState!==1)throw new Error('Not open');this.sent.push(data);}
  close(code=1000,reason=''){if(this.readyState===3)return;this.readyState=3;this.onclose?.({code,reason});}
}
const flush=async()=>{await new Promise(resolve=>setImmediate(resolve));};
async function setup(t:TestContext,fetcher?:typeof fetch){
  const names=['fetch','WebSocket','window','document'] as const;
  const previous=names.map(name=>Object.getOwnPropertyDescriptor(globalThis,name));
  FakeSocket.instances=[];
  Object.defineProperty(globalThis,'WebSocket',{configurable:true,value:FakeSocket});
  Object.defineProperty(globalThis,'window',{configurable:true,value:new EventTarget()});
  Object.defineProperty(globalThis,'document',{configurable:true,value:Object.assign(new EventTarget(),{visibilityState:'visible'})});
  Object.defineProperty(globalThis,'fetch',{configurable:true,writable:true,value:fetcher??(async(input:RequestInfo|URL)=>String(input).includes('/config')?Response.json({url:'https://games.test'}):Response.json({ticket:'synthetic',userId:'me'}))});
  const sockets:Array<{close:()=>void}>=[];
  t.after(()=>{sockets.forEach(socket=>socket.close());names.forEach((name,index)=>{const descriptor=previous[index];if(descriptor)Object.defineProperty(globalThis,name,descriptor);else Reflect.deleteProperty(globalThis,name);});});
  const result=await build({entryPoints:['src/services/socialService.ts'],bundle:true,format:'esm',platform:'node',write:false,plugins:[{name:'synthetic-auth',setup(plugin){
    plugin.onResolve({filter:/\.\/authService$/},()=>({path:'auth',namespace:'synthetic'}));
    plugin.onLoad({filter:/.*/,namespace:'synthetic'},()=>({contents:"export const authService={getAccessToken:async()=> 'synthetic-token'};"}));
  }}]});
  const api=await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text+`\n// ${Math.random()}`).toString('base64')}`) as typeof import('../../src/services/socialService');
  const statuses:string[]=[];const messages:unknown[]=[];
  const connect=()=>{
    const socket=api.connectLobby({name:'Me',color:'blue'},{onStatus:status=>statuses.push(status),onMessage:message=>messages.push(message),onOpen:()=>{}});
    sockets.push(socket);return socket;
  };
  return {api,connect,statuses,messages};
}

test('closing while a ticket request is pending cannot create a ghost socket',async t=>{
  let resolve:((response:Response)=>void)|undefined;
  const h=await setup(t,async input=>String(input).includes('/config')?Response.json({url:'https://games.test'}):new Promise<Response>(done=>{resolve=done;}));
  const socket=h.connect();await flush();socket.close();
  assert.ok(resolve);resolve(Response.json({ticket:'late',userId:'me'}));await flush();
  assert.equal(FakeSocket.instances.length,0);assert.equal(h.statuses.at(-1),'off');
});

test('reconnect replaces a socket and ignores every stale message/open callback',async t=>{
  t.mock.timers.enable({apis:['setTimeout','setInterval','Date'],now:1000});
  const h=await setup(t);const socket=h.connect();await flush();
  const first=FakeSocket.instances[0];first.open();first.message('{"t":"me","u":"me"}');first.close(1006);
  t.mock.timers.tick(1300);await flush();
  const next=FakeSocket.instances[1];assert.ok(next);next.open();
  first.message('{"t":"me","u":"stale"}');
  next.message('{"t":"me","u":"current"}');
  assert.deepEqual(h.messages,[{t:'me',u:'me'},{t:'me',u:'current'}]);
  assert.equal(socket.send({t:'sub',online:true,chat:null}),true);
  socket.close();next.open();next.message('{"t":"me","u":"late"}');
  assert.equal(h.statuses.at(-1),'off');assert.equal(h.messages.length,2);
});

test('handshake and silent half-open connections have watchdogs',async t=>{
  t.mock.timers.enable({apis:['setTimeout','setInterval','Date'],now:1000});
  const h=await setup(t);h.connect();await flush();
  t.mock.timers.tick(10001);await flush();
  assert.equal(FakeSocket.instances[0].readyState,3);assert.equal(h.statuses.at(-1),'reconnecting');
  t.mock.timers.tick(1300);await flush();
  const next=FakeSocket.instances[1];next.open();
  t.mock.timers.tick(100001);await flush();
  assert.equal(next.readyState,3,'missing pong must not leave a permanently live connection');
});

test('temporary outages retry past six attempts; invalid credentials stop retries',async t=>{
  t.mock.timers.enable({apis:['setTimeout','setInterval','Date'],now:1000});
  let attempts=0;let status=503;
  const h=await setup(t,async input=>{
    if(String(input).includes('/config'))return Response.json({url:'https://games.test'});
    attempts++;return Response.json({error:'Unavailable'},{status});
  });
  h.connect();await flush();
  for(let i=0;i<8;i++){t.mock.timers.tick(20000);await flush();}
  assert.ok(attempts>6);assert.equal(h.statuses.at(-1),'reconnecting');
  status=401;t.mock.timers.tick(20000);await flush();
  const finalAttempts=attempts;assert.equal(h.statuses.at(-1),'off');
  t.mock.timers.tick(120000);await flush();assert.equal(attempts,finalAttempts);
});

test('a congested socket reconnects instead of silently dropping the final race update',async t=>{
  t.mock.timers.enable({apis:['setTimeout','setInterval','Date'],now:1000});
  const h=await setup(t);const socket=h.connect();await flush();
  const first=FakeSocket.instances[0];first.open();first.bufferedAmount=65_537;
  assert.equal(socket.send({t:'sub',online:true,chat:101}),false);
  assert.equal(first.sent.length,0,'a congested connection cannot accept more frames');
  assert.equal(first.readyState,3,'congestion must initiate recovery even if no more state messages arrive');
  assert.equal(h.statuses.at(-1),'reconnecting');
  t.mock.timers.tick(1300);await flush();
  const next=FakeSocket.instances[1];next.open();
  assert.equal(socket.send({t:'sub',online:true,chat:101}),true);
  assert.equal(next.sent.length,1);
});

test('oversized Unicode frames are rejected without disconnecting a healthy socket',async t=>{
  const h=await setup(t);const socket=h.connect();await flush();
  const first=FakeSocket.instances[0];first.open();
  assert.equal(socket.send({t:'say',l:101,text:'中'.repeat(1500)}),false);
  assert.equal(first.readyState,1);
  assert.equal(first.sent.length,0);
  assert.equal(socket.send({t:'say',l:101,text:'你好'}),true);
});
