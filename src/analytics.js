/** Privacy-first lightweight analytics. No automatic tracking without adult opt-in.
 * Uses the existing Supabase client; collection is write-only for browsers.
 */
import {getSupabaseClient} from './auth.js';

export const ANALYTICS_CHOICE_KEY='znayu.analytics.choice.v1';
const VISITOR_KEY='znayu.analytics.visitor.v1';
const SESSION_KEY='znayu.analytics.session.v1';
export const EVENT_TYPES=Object.freeze([
 'visit','heartbeat','auth_login','diagnostic_started','diagnostic_completed',
 'lesson_started','lesson_completed','challenge_started','challenge_completed'
]);
export const ACTIVITY_TYPES=Object.freeze(['browse','lesson','diagnostic','challenge']);
export const DASHBOARD_PERIODS=Object.freeze([1,7,30]);
const events=new Set(EVENT_TYPES),activities=new Set(ACTIVITY_TYPES);
let warned=false;
let localSession=null;
let pending=0;

export function analyticsChoice(storage=globalThis.localStorage){
 try {return storage.getItem(ANALYTICS_CHOICE_KEY)||'unset';}catch{return 'unset';}
}
export function setAnalyticsChoice(value,storage=globalThis.localStorage){
 if(!['accepted','declined'].includes(value))throw Error('Invalid tracking choice');
 try{
  storage.setItem(ANALYTICS_CHOICE_KEY,value);
  if(value==='declined')storage.removeItem(VISITOR_KEY);
 }catch{}
}
export function analyticsAllowed(mode,storage=globalThis.localStorage){
 return mode==='adult'&&analyticsChoice(storage)==='accepted';
}
function stableId(storage,key){
 try{
  let id=storage.getItem(key);
  if(id&&/^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(id))return id;
  id=crypto.randomUUID();
  storage.setItem(key,id);
  return id;
 }catch{return crypto.randomUUID();}
}
export function safeActivity(value){
 return activities.has(value)?value:'browse';
}
export function currentSessionId(storage=globalThis.sessionStorage){
 if(localSession)return localSession;
 localSession=stableId(storage,SESSION_KEY);
 return localSession;
}
export async function recordAnalyticsEvent(event,{mode='adult',activity='browse',userId=null}={}){
 if(!analyticsAllowed(mode)||!events.has(event))return false;
 if(event==='auth_login'&&!userId)return false;
 if(pending>=3)return false;
 pending++;
 try{
  const supabase=await getSupabaseClient();
  const payload={
   visitor_id:stableId(globalThis.localStorage,VISITOR_KEY),
   session_id:currentSessionId(),
   event_name:event,
   activity:safeActivity(activity),
   auth_user_id:userId||null,
   learner_mode:'adult'
  };
  const {error}=await supabase.from('znayu_analytics_events').insert(payload);
  if(error)throw error;
  warned=false;return true;
 }catch(error){
  if(!warned){console.warn('Optional analytics unavailable:',String(error.message||error));warned=true;}
  return false;
 }finally{pending--;}
}
export async function isAnalyticsAdministrator(){
 const supabase=await getSupabaseClient();
 const {data,error}=await supabase.rpc('znayu_is_analytics_admin');
 if(error)throw error;
 return data===true;
}
export async function fetchAnalyticsDashboard(days=7){
 if(!DASHBOARD_PERIODS.includes(Number(days)))throw Error('Invalid report period');
 const supabase=await getSupabaseClient();
 const {data,error}=await supabase.rpc('znayu_analytics_dashboard',{p_days:Number(days)});
 if(error)throw error;
 if(!data||typeof data!=='object')throw Error('Dashboard returned invalid data');
 return data;
}
