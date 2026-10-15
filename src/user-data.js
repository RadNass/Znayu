/** Export only the explicitly selected learning profile, never auth tokens or browser analytics UUIDs. */
const VALID_MODES=new Set(['adult','student']);
export function makeProgressExport(mode,profile,now=new Date()){
 if(!VALID_MODES.has(mode))throw new Error('Unknown profile');
 if(!profile||typeof profile!=='object')throw new Error('Missing learning profile');
 return {
  source:'Znayu',format:'znayu-learning-profile-v1',exported_at:now.toISOString(),mode,
  progress:profile.progress||{},sessions:profile.sessions||[],reviews:profile.reviews||[],
  activeLesson:profile.activeLesson||null,learningPath:profile.learningPath||null,
  challengeHistory:profile.challengeHistory||[]
 };
}
export function exportFilename(mode,now=new Date()){
 if(!VALID_MODES.has(mode))throw new Error('Unknown profile');
 return `znayu-${mode}-${now.toISOString().slice(0,10)}.json`;
}
export function mayEraseLocalProfile(mode,hasCloudAccount){
 return mode==='student'||mode==='adult'&&!hasCloudAccount;
}
