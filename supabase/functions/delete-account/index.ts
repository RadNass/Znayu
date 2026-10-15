/**
 * Znayu account deletion — PREPARED, NOT DEPLOYED by publishing this repository.
 *
 * Supabase Edge Function. Never call service-role endpoints from the browser.
 * Authentication: @supabase/server with auth:'user' validates bearer JWT.
 * Additional protections: exact allowed Origin, JSON-only POST, recent sign-in,
 * fixed confirmation phrase, authenticated owner identity, generic errors.
 */
import { withSupabase } from 'npm:@supabase/server@1';

const ALLOWED_ORIGIN='https://radnass.github.io';
const CONFIRM='УДАЛИТЬ МОЙ АККАУНТ';
const TEN_MINUTES_MS=10*60*1000;
const HEADERS={
 'Content-Type':'application/json; charset=utf-8',
 'Cache-Control':'no-store',
 'X-Content-Type-Options':'nosniff'
};
function respond(status:number,body:Record<string,unknown>,origin=''){
 return new Response(JSON.stringify(body),{status,headers:{
  ...HEADERS,...(origin===ALLOWED_ORIGIN?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})
 }});
}
function recentLogin(signIn:string|null|undefined,now=Date.now()){
 const timestamp=Date.parse(String(signIn||''));
 return Number.isFinite(timestamp)&&timestamp<=now+30_000&&timestamp>=now-TEN_MINUTES_MS;
}

export default {
 fetch: withSupabase({auth:'user'},async (req,ctx)=>{
  const origin=req.headers.get('Origin')||'';
  if(origin!==ALLOWED_ORIGIN)return respond(403,{error:'origin_not_allowed'});
  if(req.method==='OPTIONS')return new Response(null,{
   status:204,headers:{
    'Access-Control-Allow-Origin':ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods':'POST, OPTIONS',
    'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info',
    'Access-Control-Max-Age':'600',
    'Vary':'Origin'
   }
  });
  if(req.method!=='POST')return respond(405,{error:'method_not_allowed'},origin);
  if(!req.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
   return respond(415,{error:'json_required'},origin);
  if(Number(req.headers.get('content-length')||0)>256)
   return respond(413,{error:'body_too_large'},origin);
  let body:unknown;
  try{
   const raw=await req.text();
   if(raw.length>256)return respond(413,{error:'body_too_large'},origin);
   body=JSON.parse(raw);
  }catch{return respond(400,{error:'invalid_json'},origin);}
  if(!body||typeof body!=='object'||Array.isArray(body)||
   (body as Record<string,unknown>).confirmation!==CONFIRM)
   return respond(400,{error:'confirmation_required'},origin);

  // ID can only come from a verified JWT — NEVER from the request body.
  const uid=ctx.userClaims?.id||ctx.userClaims?.sub;
  if(!uid||typeof uid!=='string')return respond(401,{error:'not_authenticated'},origin);

  // Get last_sign_in_at from the trusted Auth database, not client-supplied input.
  const {data:authData,error:authError}=await ctx.supabaseAdmin.auth.admin.getUserById(uid);
  if(authError||!authData?.user)return respond(401,{error:'not_authenticated'},origin);
  if(!recentLogin(authData.user.last_sign_in_at))
   return respond(403,{error:'sign_in_again',message:'Войдите заново: последнему входу больше 10 минут.'},origin);

  // Clean only rows tied to this exact authenticated user. Anonymous visitor UUIDs
  // cannot be linked reliably to an account and must be managed separately.
  const {error:metricsError}=await ctx.supabaseAdmin
   .from('znayu_analytics_events').delete().eq('auth_user_id',uid);
  if(metricsError)return respond(503,{error:'data_cleanup_unavailable'},origin);

  const {error:progressError}=await ctx.supabaseAdmin
   .from('learner_progress').delete().eq('user_id',uid);
  if(progressError)return respond(503,{error:'data_cleanup_unavailable'},origin);

  const {error:deleteError}=await ctx.supabaseAdmin.auth.admin.deleteUser(uid);
  if(deleteError)return respond(503,{error:'deletion_failed'},origin);

  return respond(200,{deleted:true},origin);
 })
};
