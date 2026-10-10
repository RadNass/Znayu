const KEY='ponyatno.app.v1';
export function defaultState(){
 return {version:1,mode:null,grade:'6',profiles:{adult:{progress:{},sessions:[],reviews:[]},student:{progress:{},sessions:[],reviews:[]}},lastSkill:null,createdAt:new Date().toISOString()};
}
export function loadState(){
 try {
  const raw=localStorage.getItem(KEY);if(!raw)return defaultState();
  const obj=JSON.parse(raw);if(obj?.version!==1||!obj.profiles)return defaultState();
  for(const mode of ['adult','student']){
   if(!obj.profiles[mode])obj.profiles[mode]={progress:{},sessions:[],reviews:[]};
   obj.profiles[mode].progress??={};obj.profiles[mode].sessions??=[];obj.profiles[mode].reviews??=[];
  }
  return obj;
 }catch {return defaultState();}
}
export function saveState(obj){
 try{localStorage.setItem(KEY,JSON.stringify(obj));return true;}
 catch{return false;}
}
export function progressOf(state){return state.profiles[state.mode||'adult'].progress;}
export function statusOf(progress,id){return progress[id]?.status||'new';}
export function summarizeProgress(progress,skills){
 const learned=skills.filter(s=>['learned','mastered'].includes(statusOf(progress,s.id))).length;
 const mastered=skills.filter(s=>statusOf(progress,s.id)==='mastered').length;
 const learning=skills.filter(s=>statusOf(progress,s.id)==='learning').length;
 return {learned,mastered,learning,total:skills.length,percent:Math.round(100*learned/skills.length)};
}
export function reviewDue(progress,now=new Date()){
 return Object.entries(progress).filter(([,p])=>p.reviewAt&&new Date(p.reviewAt)<=now).map(([id])=>id);
}
export function nextReview(days=3,now=new Date()){
 return new Date(now.getTime()+days*86400000).toISOString();
}
