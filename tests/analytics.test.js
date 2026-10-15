import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {analyticsChoice,setAnalyticsChoice,analyticsAllowed,EVENT_TYPES,ACTIVITY_TYPES,DASHBOARD_PERIODS,safeActivity} from '../src/analytics.js';

function memoryStorage(){
 const memory=new Map();
 return {getItem:key=>memory.get(key)??null,setItem:(key,val)=>memory.set(key,String(val)),removeItem:key=>memory.delete(key)};
}
test('analytics is off by default and adult consent is required',()=>{
 const s=memoryStorage();
 assert.equal(analyticsChoice(s),'unset');
 assert.equal(analyticsAllowed('adult',s),false);
 assert.equal(analyticsAllowed('student',s),false);
 setAnalyticsChoice('accepted',s);
 assert.equal(analyticsAllowed('adult',s),true);
 assert.equal(analyticsAllowed('student',s),false);
 setAnalyticsChoice('declined',s);
 assert.equal(analyticsAllowed('adult',s),false);
 assert.throws(()=>setAnalyticsChoice('invalid',s));
});
test('only defined coarse-grained events and activities may be sent',()=>{
 assert.deepEqual(EVENT_TYPES,[
  'visit','heartbeat','auth_login','diagnostic_started','diagnostic_completed',
  'lesson_started','lesson_completed','challenge_started','challenge_completed'
 ]);
 assert.deepEqual(ACTIVITY_TYPES,['browse','lesson','diagnostic','challenge']);
 assert.deepEqual(DASHBOARD_PERIODS,[1,7,30]);
 assert.equal(safeActivity('lesson'),'lesson');
 assert.equal(safeActivity('learner-email@example.com'),'browse');
});
test('auth session is reused, while analytics never commits a secret or answers',()=>{
 const source=readFileSync(new URL('../src/analytics.js',import.meta.url),'utf8');
 const auth=readFileSync(new URL('../src/auth.js',import.meta.url),'utf8');
 assert.match(source,/getSupabaseClient/);
 assert.match(auth,/export async function getSupabaseClient\(\)/);
 assert.doesNotMatch(source,/service_role|sb_secret_|answer\s*:/);
 assert.match(source,/analyticsAllowed\(mode\)/);
 assert.match(source,/mode==='adult'/);
 assert.match(source,/session_id:/);
 assert.match(source,/visitor_id:/);
});
test('dashboard link requires admin and telemetry records key learning events',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(app,/if\(analyticsAdmin&&state.mode==='adult'\)/);
 assert.match(app,/case 'analytics':c=analyticsPage\(\)/);
 assert.match(app,/data-action="analytics-consent-yes"/);
 assert.match(app,/data-action="analytics-consent-no"/);
 assert.match(app,/trackAnalytics\('lesson_started'/);
 assert.match(app,/trackAnalytics\('lesson_completed'/);
 assert.match(app,/trackAnalytics\('diagnostic_started'/);
 assert.match(app,/trackAnalytics\('diagnostic_completed'/);
 assert.match(app,/trackAnalytics\('auth_login'/);
 assert.match(app,/setInterval\(\(\)=>\{/);
 assert.match(app,/document.visibilityState==='visible'/);
 assert.match(app,/150 секунд/);
 assert.match(app,/детский|Детский|Детские|Данные ребёнка|детский|детском|Детский/);
});
test('SQL denies public read, includes an admin-only report and minimal metadata',()=>{
 const sql=readFileSync(new URL('../supabase/analytics_setup.sql',import.meta.url),'utf8');
 assert.match(sql,/enable row level security/);
 assert.match(sql,/revoke all on public.znayu_analytics_events from public,anon,authenticated/);
 assert.match(sql,/grant insert on public.znayu_analytics_events to anon,authenticated/);
 assert.match(sql,/znayu_analytics_dashboard\(p_days integer default 7\)/);
 assert.match(sql,/raise exception 'Analytics access denied'/);
 assert.match(sql,/znayu_analytics_admins/);
 assert.match(sql,/auth\.uid\(\)/);
 assert.match(sql,/grant execute on function public.znayu_analytics_dashboard\(integer\) to authenticated/);
 assert.match(sql,/auth\.users/);
 assert.doesNotMatch(sql,/grant select on public.znayu_analytics_events to anon/i);
 assert.doesNotMatch(sql,/CREATE POLICY .* FOR SELECT TO anon/i);
});
