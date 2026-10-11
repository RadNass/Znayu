import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/src/index.js';
const origin='https://radnass.github.io';
const env={OPENAI_API_KEY:'test-secret',TURNSTILE_SECRET:'turnstile-secret',ALLOWED_ORIGIN:origin,TURNSTILE_HOSTNAME:'radnass.github.io',MODEL:'gpt-4.1-mini',RATE_LIMITER:{limit:async()=>({success:true})}};
const valid={token:'a-valid-token',mode:'adult',skill:{title:'Сложение дробей',intro:'Общий знаменатель',example:'1/2 + 1/3'},question:{text:'Сколько 1/2 + 1/4?',hint:'Общий знаменатель 4'},message:'Почему нужно приводить к общему знаменателю?',wrongTries:1,history:[]};
const make=(data,from=origin)=>new Request('https://api.example.workers.dev/tutor',{method:'POST',headers:{'Origin':from,'Content-Type':'application/json'},body:JSON.stringify(data)});
test('health endpoint works without credentials',async()=>{
 const res=await worker.fetch(new Request('https://api.example.workers.dev/health'),{});
 assert.equal(res.status,200);
 assert.equal((await res.json()).configured,false);
});
test('rejects wrong origin before upstream calls',async()=>{
 const res=await worker.fetch(make(valid,'https://malicious.example'),env);
 assert.equal(res.status,403);
});
test('rejects unconfigured backend and unconsented student AI',async()=>{
 assert.equal((await worker.fetch(make(valid),{})).status,503);
 assert.equal((await worker.fetch(make({...valid,mode:'student'}),env)).status,403);
});
test('validates Turnstile before proxying and does not echo credentials',async()=>{
 const original=globalThis.fetch;
 const calls=[];
 globalThis.fetch=async (url,opts)=>{
  calls.push({url:String(url),opts});
  if(String(url).includes('/siteverify'))return Response.json({success:true,action:'tutor',hostname:'radnass.github.io'});
  if(String(url).includes('api.openai.com'))return Response.json({output:[{content:[{type:'output_text',text:'Начнём с общего знаменателя. Какое число делится на 2 и на 4?'}]}]});
  throw Error('Unexpected request');
 };
 try{
  const res=await worker.fetch(make(valid),env);
  assert.equal(res.status,200);
  assert.match((await res.json()).reply,/общего знаменателя/);
  assert.equal(calls.length,2);
  const payload=JSON.parse(calls[1].opts.body);
  assert.equal(payload.store,false);
  assert.ok(payload.max_output_tokens<=240);
  assert.ok(!calls[1].opts.body.includes('test-secret'));
 }finally{globalThis.fetch=original;}
});
test('rejects fake verification and throttles requests',async()=>{
 const fakeFetch=globalThis.fetch;
 globalThis.fetch=async()=>Response.json({success:false});
 try{assert.equal((await worker.fetch(make(valid),env)).status,403);}finally{globalThis.fetch=fakeFetch;}
 const throttled={...env,RATE_LIMITER:{limit:async()=>({success:false})}};
 assert.equal((await worker.fetch(make(valid),throttled)).status,429);
});
