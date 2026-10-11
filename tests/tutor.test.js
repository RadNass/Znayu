import test from 'node:test';
import assert from 'node:assert/strict';
import {SKILL_BY_ID} from '../src/content.js';
import {classifyMistake,hintFor,lessonMessage,recordTutorMessage,suggestedBridge} from '../src/tutor.js';

const add=SKILL_BY_ID['fraction-add'];
const q=add.questions[0];
test('common fraction misconception is recognized',()=>{
 const info=classifyMistake(add,q,'2/10');
 assert.equal(info.code,'add-denominators');
 assert.equal(info.bridge,'common-denominator');
 assert.equal(suggestedBridge(add,info,SKILL_BY_ID).title,SKILL_BY_ID['common-denominator'].title);
});
test('fraction hint grows with intervention but does not reveal result',()=>{
 for(let level=1;level<=3;level++){
  const t=hintFor({skill:add,question:q,level,mode:'student'});
  assert.ok(t.length>35);
  assert.ok(!t.includes('5/12'),`Unexpected full answer in hint ${level}`);
 }
});
test('offline dialogue gives precise, one-step prompts and no inappropriate grading',()=>{
 assert.match(lessonMessage({skill:add,question:q,text:'Почему это правило работает?',mode:'student'}),/знаменател|дроб|част/);
 assert.match(lessonMessage({skill:add,question:q,text:'3/12'}),/поле «Твой ответ»/);
 assert.doesNotMatch(lessonMessage({skill:add,question:q,text:'Объясни проще',mode:'adult'}),/5\/12/);
 const explanation=lessonMessage({skill:add,question:q,text:'Покажи ответ',wrongTries:3,solved:false});
 assert.ok(explanation.includes(q.explain));
});
test('conversation bounded and associated with current lesson step',()=>{
 const session={index:0};
 for(let i=0;i<30;i++)recordTutorMessage(session,i%2?'user':'assistant',`сообщение ${i}`);
 assert.equal(session.tutorMessages.length,16);
 assert.equal(session.tutorMessages[0].index,0);
});
test('percent error recommends percentage prerequisite',()=>{
 const p=SKILL_BY_ID['percent-of'];
 const x=classifyMistake(p,p.questions[0],'999');
 assert.equal(x.code,'percent-base');
 assert.equal(x.bridge,'percent-basics');
});
