/** Adult-only Supabase Auth. Dynamically loaded to keep lessons available offline. */
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './supabase-config.js';
import {packAdultProgress,unpackAdultProgress} from './personal-path.js';
let connection;
async function api(){
 if(!connection)connection=import('https://esm.sh/@supabase/supabase-js@2.57.0').then(({createClient})=>createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
  auth:{detectSessionInUrl:true,persistSession:true,autoRefreshToken:true,flowType:'pkce'}
 })).catch(error=>{connection=null;throw error;});
 return connection;
}
function assertNoError(result){if(result.error)throw new Error(result.error.message||'Ошибка Supabase');return result.data;}
export async function authUser(){const supa=await api();const {data,error}=await supa.auth.getUser();if(error)return null;return data.user||null;}
export async function login(email,password){const supa=await api();return assertNoError(await supa.auth.signInWithPassword({email,password}));}
export async function register(email,password){const supa=await api();return assertNoError(await supa.auth.signUp({email,password,options:{emailRedirectTo:'https://radnass.github.io/Znayu/'}}));}
export async function signInWithGoogle(){
 const supa=await api();
 return assertNoError(await supa.auth.signInWithOAuth({
  provider:'google',
  options:{redirectTo:'https://radnass.github.io/Znayu/'}
 }));
}
export async function logout(){const supa=await api();return assertNoError(await supa.auth.signOut());}
export async function resetPassword(email){const supa=await api();return assertNoError(await supa.auth.resetPasswordForEmail(email,{redirectTo:'https://radnass.github.io/Znayu/'}));}
export async function fetchAdultData(userId){
 const supa=await api();
 const row=assertNoError(await supa.from('learner_progress')
  .select('user_id,adult_progress,adult_sessions,adult_active_lesson').eq('user_id',userId).maybeSingle());
 if(!row)return null;
 const {progress,learningPath}=unpackAdultProgress(row.adult_progress);
 return {...row,adult_progress:progress,adult_learning_path:learningPath};
}
export async function writeAdultData(userId,adult){
 const supa=await api();
 return assertNoError(await supa.from('learner_progress').upsert({
  user_id:userId,
  adult_progress:packAdultProgress(adult.progress||{},adult.learningPath),
  adult_sessions:(adult.sessions||[]).slice(0,50),
  adult_active_lesson:adult.activeLesson||null,
  updated_at:new Date().toISOString()
 },{onConflict:'user_id'}));
}
