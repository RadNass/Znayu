import test from 'node:test';
import assert from 'node:assert/strict';
import {MODULES,SKILLS,SKILL_BY_ID,skillsOf,ancestors} from '../src/content.js';
import {checkAnswer} from '../src/math.js';
import {PROFESSIONAL_MODULES,PROFESSIONAL_SKILLS,PROFESSIONAL_DIFFICULTY_BANK} from '../src/professional-content.js';
import {availableLevels,questionsForLevel,recordLevelResult,difficultyState} from '../src/difficulty.js';

test('analyst and financier subjects are full curriculum sections',()=>{
 assert.deepEqual(PROFESSIONAL_MODULES.map(m=>m.id),['analytics','finance']);
 assert.equal(PROFESSIONAL_SKILLS.length,8);
 assert.equal(MODULES.length,15);
 assert.equal(SKILLS.length,83);
 assert.deepEqual(skillsOf('analytics').map(x=>x.id),['analyst-funnel','analyst-experiments','analyst-data','analyst-cohorts']);
 assert.deepEqual(skillsOf('finance').map(x=>x.id),['finance-interest','finance-inflation','finance-loans','finance-projects']);
 for(const skill of PROFESSIONAL_SKILLS){
  assert.equal(skill.questions.length,3,skill.id);
  assert.ok(skill.misconception.length>=15);
  assert.deepEqual(availableLevels(skill.id),[1,2,3,4]);
  assert.ok(SKILL_BY_ID[skill.id]);
  for(const dep of skill.prereq)assert.ok(SKILL_BY_ID[dep],skill.id+' missing '+dep);
  assert.ok(!ancestors(skill.id).some(x=>x.id===skill.id));
 }
});

test('all professional levels contain nonempty answerable and explained questions',()=>{
 let count=0;
 for(const skill of PROFESSIONAL_SKILLS)for(let level=1;level<=4;level++){
  const qs=questionsForLevel(skill,level);
  assert.equal(qs.length,3,skill.id+': '+level);
  const seen=new Set();
  for(const q of qs){
   count++;
   assert.ok(q.text.length>=20,skill.id+': question');
   assert.ok(q.hint.length>=8,skill.id+': hint');
   assert.ok(q.explain.length>=8,skill.id+': explanation');
   assert.ok(checkAnswer(q.answer,q.answer,q.kind),'Answer cannot be parsed: '+skill.id+': '+q.answer);
   assert.ok(!seen.has(q.text),'Duplicate task '+skill.id+' / '+level);
   seen.add(q.text);
  }
 }
 assert.equal(count,96);
 assert.equal(Object.keys(PROFESSIONAL_DIFFICULTY_BANK).length,8);
});

test('professional level remains per topic and requires repeated independent practice',()=>{
 let state=difficultyState({},'finance-interest');
 state=recordLevelResult(state,'finance-interest',1,3,3);
 assert.equal(state.confirmed,0);
 state=recordLevelResult(state,'finance-interest',1,3,3);
 assert.equal(state.confirmed,1);
 assert.equal(state.recommended,2);
 const copy=JSON.parse(JSON.stringify({status:'learned',difficulty:state}));
 assert.equal(difficultyState({'finance-interest':copy},'finance-interest').selected,2);
 assert.equal(difficultyState({},'analyst-funnel').confirmed,0);
});

test('selected numerical benchmark answers are mathematically correct',()=>{
 const q=(id,level,n)=>questionsForLevel(SKILL_BY_ID[id],level)[n];
 const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-7,`Expected ${actual} ≈ ${expected}`);
 near(Number(q('analyst-funnel',4,0).answer),20000*.4*.15);
 near(Number(q('finance-interest',4,0).answer),1000*1.2**3);
 near(Number(q('finance-projects',3,2).answer),550/1.1+605/1.1**2-1000);
 near(Number(q('finance-loans',4,0).answer),100000*.02+50000*.02);
 near(Number(q('analyst-cohorts',4,0).answer),(100*.8+900*.2)/(100+900)*100);
});
