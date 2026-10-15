import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MODULES,SKILL_BY_ID,skillsOf} from '../src/content.js';
import {nextRecommendedSkill} from '../src/next-lesson.js';
const context=(currentId,progress={},rest={})=>nextRecommendedSkill(currentId,{
 skills:SKILL_BY_ID,modules:MODULES,skillsOf,progress,...rest
});
test('after place value, recommends the actual next arithmetic skill, not a random unrelated lesson',()=>{
 const next=context('place-value');
 assert.equal(next.skillId,'whole-compare');
 assert.equal(next.source,'curriculum');
});
test('after mastering next skill, avoids repeating learned subjects',()=>{
 const next=context('place-value',{'whole-compare':{status:'learned'}});
 assert.equal(next.skillId,'whole-add');
});
test('recommendation respects missing prerequisites and does not unlock advanced content prematurely',()=>{
 const next=context('whole-add');
 assert.equal(next.skillId,'whole-sub');
 const no= context('whole-multiply',{'whole-add':{status:'learning'}});
 assert.equal(no?.skillId,'whole-division'); // whole-multiply is the direct prerequisite
});
test('within each subject, recommended skills are not already learned or the same skill',()=>{
 for(const id of ['fraction-parts','logic','binary','analyst-funnel','finance-interest','fraction-add']){
  const n=context(id);
  if(!n)continue;
  assert.notEqual(n.skillId,id);
  assert.ok(SKILL_BY_ID[n.skillId]);
  const same=id=>SKILL_BY_ID[id];
  const missing=same(n.skillId).prereq.filter(req=>req!==id);
  assert.equal(missing.length,0, id+' must not suggest unlearned prerequisites '+missing.join(','));
 }
});
test('personal path takes priority only for a lesson completed from that route',()=>{
 const path={steps:[{skillId:'place-value',status:'done'},{skillId:'whole-add',status:'todo'}]};
 const next=context('place-value',{}, {learningPath:path,fromPath:true});
 assert.equal(next.skillId,'whole-add');
 assert.equal(next.source,'path');
 const ordinary=context('place-value',{}, {learningPath:path,fromPath:false});
 assert.equal(ordinary.skillId,'whole-compare');
});
test('result screen emphasizes next lesson and preserves retry and difficulty actions',()=>{
 const code=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(code,/nextRecommendedSkill\(s\.id/);
 assert.match(code,/Следующий урок:/);
 assert.match(code,/Перейти к следующему уроку/);
 assert.match(code,/data-action="start-lesson" data-id="\$\{suggested.id\}"/);
 assert.match(code,/Потренироваться ещё/);
 assert.match(code,/Выбрать сложность/);
 assert.match(code,/r.fromPath/);
});
