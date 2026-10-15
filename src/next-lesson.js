/** Curriculum continuation recommendations based on dependency graph, not random ordering.
 * The learner can always choose another lesson, but unmet prerequisites are never hidden.
 */
export function nextRecommendedSkill(currentId,{skills,modules,skillsOf,progress={},learningPath=null,fromPath=false}){
 const current=skills[currentId];if(!current)return null;
 const status=id=>['learned','mastered'].includes(progress?.[id]?.status);
 if(fromPath&&learningPath?.steps?.length){
  const next=learningPath.steps.find(x=>x.status!=='done'&&x.skillId!==currentId&&skills[x.skillId]);
  if(next)return {skillId:next.skillId,reason:'Следующий шаг твоего персонального маршрута',source:'path'};
 }
 const module=modules.find(m=>skillsOf(m.id).some(s=>s.id===currentId));if(!module)return null;
 const ordered=skillsOf(module.id);
 const index=ordered.findIndex(s=>s.id===currentId);
 const isReady=skill=>(skill.prereq||[]).every(id=>id===currentId||status(id));
 // Prefer the first unlearned direct successor where this is a prerequisite.
 const dependents=ordered.filter(s=>s.id!==currentId&&(s.prereq||[]).includes(currentId)&&!status(s.id)&&isReady(s));
 const pick=dependents[0]||ordered.slice(index+1).find(s=>s.id!==currentId&&!status(s.id)&&isReady(s));
 if(pick)return {skillId:pick.id,reason:'Следующая тема по программе',source:'curriculum'};
 // There may be additional dependent skills in another module; find those only if prerequisites pass.
 const advanced=modules.flatMap(m=>skillsOf(m.id)).find(s=>s.id!==currentId&&
 (s.prereq||[]).includes(currentId)&&!status(s.id)&&isReady(s));
 if(advanced)return {skillId:advanced.id,reason:'Теперь пригодится этот навык',source:'dependency'};
 // Existing curriculum may have multiple equally valid branches. Offer an earlier
 // unlearned lesson only when its prerequisites have been met, never inventing a sequence.
 const other=ordered.find(s=>s.id!==currentId&&!status(s.id)&&isReady(s));
 return other?{skillId:other.id,reason:'Ещё одна тема этого раздела',source:'module'}:null;
}
