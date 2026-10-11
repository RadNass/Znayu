import test from 'node:test';
import assert from 'node:assert/strict';
import {SKILL_BY_ID} from '../src/content.js';
import {createPersonalDiagnostic,prerequisiteOrder,diagnosticQuestion,recordDiagnostic,diagnosticGaps,createLearningPath,nextPathStep,completePathStep,pathProgress,packAdultProgress,unpackAdultProgress} from '../src/personal-path.js';

test('prerequisites are ordered deepest-first with selected goal last',()=>{
 const ids=prerequisiteOrder('fraction-add',SKILL_BY_ID);
 assert.ok(ids.indexOf('fraction-parts')<ids.indexOf('fraction-equivalent'));
 assert.ok(ids.indexOf('fraction-equivalent')<ids.indexOf('common-denominator'));
 const d=createPersonalDiagnostic('fraction-add',SKILL_BY_ID);
 assert.equal(d.skillIds.at(-1),'fraction-add');
 assert.ok(d.skillIds.includes('common-denominator'));
 assert.equal(d.version,2);
});
test('incorrect answer triggers follow-up, then moves on',()=>{
 let d=createPersonalDiagnostic('fraction-add',SKILL_BY_ID);
 const first=diagnosticQuestion(d,SKILL_BY_ID);
 d=recordDiagnostic(d,'0',false,{},SKILL_BY_ID);
 assert.equal(d.index,0);assert.equal(d.stage,1);
 assert.notEqual(diagnosticQuestion(d,SKILL_BY_ID).questionIndex,first.questionIndex);
 d=recordDiagnostic(d,'1',true,{},SKILL_BY_ID);
 assert.equal(d.index,1);assert.equal(d.stage,0);
 assert.equal(diagnosticGaps(d)[0].skillId,first.skillId);
});
test('skipped question is a gap and does not require extra follow-up',()=>{
 let d=createPersonalDiagnostic('fraction-add',SKILL_BY_ID);
 d=recordDiagnostic(d,null,false,{skipped:true},SKILL_BY_ID);
 assert.equal(d.index,1);
 assert.equal(d.records[0].answer,null);
});
test('path restores foundations before the chosen target and requires independent work',()=>{
 let d=createPersonalDiagnostic('fraction-add',SKILL_BY_ID);
 for(let n=0;n<100&&!d.finished;n++){
  const current=diagnosticQuestion(d,SKILL_BY_ID);
  const fail=current.skillId==='fraction-parts'&&d.stage===0;
  d=recordDiagnostic(d,fail?'unknown':current.question.answer,!fail,{},SKILL_BY_ID);
 }
 assert.equal(d.finished,true);
 const p=createLearningPath(d,SKILL_BY_ID);
 assert.deepEqual(p.steps.map(x=>x.skillId),['fraction-parts','fraction-add']);
 assert.equal(nextPathStep(p).skillId,'fraction-parts');
 assert.equal(completePathStep(p,'fraction-parts',1),p);
 const after=completePathStep(p,'fraction-parts',2);
 assert.equal(nextPathStep(after).skillId,'fraction-add');
 const done=completePathStep(after,'fraction-add',2);
 assert.equal(done.status,'complete');
 assert.deepEqual(pathProgress(done),{done:2,total:2,percent:100});
});
test('passes with no target can produce a clear diagnostic',()=>{
 let d=createPersonalDiagnostic('base',SKILL_BY_ID);
 while(!d.finished){const current=diagnosticQuestion(d,SKILL_BY_ID);d=recordDiagnostic(d,current.question.answer,true,{},SKILL_BY_ID);}
 const p=createLearningPath(d,SKILL_BY_ID);
 assert.equal(p.steps.length,0);assert.equal(p.status,'clear');
});
test('adult cloud payload packs path without leaking it as a skill',()=>{
 const path={version:1,status:'active',steps:[{skillId:'fraction-add',status:'pending'}]};
 const packed=packAdultProgress({'fraction-add':{status:'learning'}},path);
 assert.ok(packed.__znayu_learning_path_v1);
 const decoded=unpackAdultProgress(packed);
 assert.deepEqual(decoded.learningPath,path);
 assert.deepEqual(Object.keys(decoded.progress),['fraction-add']);
});
