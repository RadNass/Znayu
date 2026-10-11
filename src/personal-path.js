/** Adaptive diagnostic and recovery path. Deterministic checking, no model grading. */
export const DIAGNOSTIC_TRACKS = Object.freeze({
 base:['place-value','whole-division','order-operations','fraction-parts','common-denominator','fraction-divide','percent-basics'],
 algebra:['negative-concept','negative-subtract','variables','distributive','linear-equations','function-table','graphs'],
 it:['order-operations','logic','sets','binary','mean','probability','percentage-change']
});
export const PATH_CLOUD_KEY='__znayu_learning_path_v1';

export function prerequisiteOrder(skillId,skills,max=7){
 const seen=new Set(),ordered=[];
 function visit(id){
  const item=skills[id];if(!item)return;
  for(const p of item.prereq||[]){
   if(seen.has(p)||!skills[p])continue;
   seen.add(p);visit(p);ordered.push(p);
  }
 }
 visit(skillId);
 return ordered.slice(-max);
}
export function createPersonalDiagnostic(targetId,skills){
 const isTarget=Boolean(skills[targetId]);
 const focus=isTarget?'topic':DIAGNOSTIC_TRACKS[targetId]?''+targetId:'base';
 const ids=isTarget?[...prerequisiteOrder(targetId,skills,6),targetId]:
  DIAGNOSTIC_TRACKS[focus].filter(id=>Boolean(skills[id]));
 return {version:2,targetId:isTarget?targetId:null,focus,skillIds:[...new Set(ids)],
  index:0,stage:0,records:[],finished:false};
}
export function diagnosticQuestion(d,skills){
 if(!d||d.version!==2||d.index>=d.skillIds.length)return null;
 const id=d.skillIds[d.index],skill=skills[id];
 if(!skill)return null;
 const questionIndex=Math.min(d.stage||0,skill.questions.length-1);
 return {skillId:id,skill,questionIndex,question:skill.questions[questionIndex]};
}
export function recordDiagnostic(d,answer,correct,{skipped=false,mistake=null}={},skills){
 const current=diagnosticQuestion(d,skills);
 if(!current)return d;
 const {skillId,questionIndex,skill}=current;
 const entry={skillId,questionIndex,answer:skipped?null:String(answer).slice(0,80),
  correct:Boolean(correct)&&!skipped,skipped:Boolean(skipped),mistake:mistake?String(mistake).slice(0,120):null};
 const record=[...d.records,entry];
 const retry=!entry.correct&&!entry.skipped&&d.stage===0&&skill.questions.length>1;
 return {...d,records:record,index:retry?d.index:d.index+1,stage:retry?1:0,
  finished:!retry&&d.index+1>=d.skillIds.length};
}
export function diagnosticGaps(d){
 const results=new Map();
 for(const r of d?.records||[]){
  if(!results.has(r.skillId))results.set(r.skillId,{skillId:r.skillId,first:r,failed:0,tried:0});
  const agg=results.get(r.skillId);agg.tried++;if(!r.correct)agg.failed++;
 }
 return [...results.values()].filter(r=>r.failed>0);
}
export function createLearningPath(d,skills){
 if(!d?.finished)throw Error('Finish the diagnostic before creating a path');
 const gaps=diagnosticGaps(d);
 const failed=new Set(gaps.map(g=>g.skillId));
 const steps=d.skillIds.filter(id=>failed.has(id)).map(id=>({
   skillId:id,kind:'gap',status:'pending',completedAt:null,
   reason:gaps.find(g=>g.skillId===id)?.first?.skipped?'Пока не знаю правило':
    'Были затруднения в проверке'
 }));
 if(d.targetId&&skills[d.targetId]&&!steps.some(x=>x.skillId===d.targetId)){
  steps.push({skillId:d.targetId,kind:'goal',status:'pending',completedAt:null,
   reason:'Возвращаемся к выбранной теме'});
 }else if(d.targetId){
  const target=steps.find(x=>x.skillId===d.targetId);
  if(target)target.kind='goal';
 }
 return {version:1,targetId:d.targetId||null,focus:d.focus,createdAt:new Date().toISOString(),
  steps,status:steps.length?'active':'clear',gaps:gaps.map(g=>({skillId:g.skillId,failed:g.failed,tried:g.tried}))};
}
export function nextPathStep(path){return path?.steps?.find(step=>step.status!=='done')||null;}
export function completePathStep(path,skillId,independent){
 if(!path?.steps||independent<2)return path;
 const index=path.steps.findIndex(step=>step.skillId===skillId&&step.status!=='done');
 if(index<0)return path;
 const steps=path.steps.map((step,i)=>i===index?{...step,status:'done',completedAt:new Date().toISOString()}:step);
 return {...path,steps,status:steps.every(step=>step.status==='done')?'complete':'active'};
}
export function pathProgress(path){
 const count=path?.steps?.length||0,done=path?.steps?.filter(s=>s.status==='done').length||0;
 return {done,total:count,percent:count?Math.round(done/count*100):100};
}
export function packAdultProgress(progress,learningPath){
 return {...progress,[PATH_CLOUD_KEY]:learningPath||null};
}
export function unpackAdultProgress(raw){
 const progress={...(raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{})};
 const learningPath=progress[PATH_CLOUD_KEY]||null;
 delete progress[PATH_CLOUD_KEY];
 return {progress,learningPath};
}
