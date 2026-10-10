import test from 'node:test';
import assert from 'node:assert/strict';
import {SKILLS,MODULES,skillsOf,SKILL_BY_ID,ancestors} from '../src/content.js';
import {checkAnswer} from '../src/math.js';

test('content contains a well-formed connected curriculum',()=>{
 assert.ok(SKILLS.length>=20);
 assert.equal(new Set(SKILLS.map(s=>s.id)).size,SKILLS.length);
 const assigned=MODULES.flatMap(m=>skillsOf(m.id).map(s=>s.id));
 assert.equal(new Set(assigned).size,SKILLS.length);
 for(const s of SKILLS){
   assert.ok(s.questions.length>=3,s.id);
   for(const p of s.prereq)assert.ok(SKILL_BY_ID[p],`Missing ${p}`);
   for(const q of s.questions){
     assert.ok(q.text&&q.answer&&q.hint&&q.explain,`${s.id}: incomplete question`);
     assert.ok(checkAnswer(q.answer,q.answer,q.kind),`${s.id}: invalid expected answer ${q.answer}`);
   }
   assert.ok(!ancestors(s.id).some(x=>x.id===s.id),`Circular dependency ${s.id}`);
 }
});

test('filling & draining requires joint-work and subtraction',()=>{
 assert.deepEqual(SKILL_BY_ID['fill-drain'].prereq,['joint-work','fraction-subtract']);
});
