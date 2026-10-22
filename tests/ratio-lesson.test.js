import test from 'node:test';
import assert from 'node:assert/strict';
import {SKILL_BY_ID} from '../src/content.js';
import {conceptSteps} from '../src/lesson-presentation.js';
import {ratioSteps,ratioPosition,ratioModel,interactWithRatio,renderRatioLesson} from '../src/ratio-lesson.js';
import {defaultState,saveState,loadState} from '../src/storage.js';

const session=index=>({skillId:'ratios',phase:'concept',conceptIndex:index,index:1,answers:[{correct:true}],wrongTries:2});

test('ratio examples teach meaning, order, difference, scaling and part-to-whole in sequence',()=>{
 const steps=conceptSteps(SKILL_BY_ID.ratios);
 assert.equal(steps.length,5);
 assert.match(steps[0].text,/посчитать или измерить/);
 assert.match(steps[0].understand,/на каждую синюю приходится две красные/);
 assert.match(steps[1].math,/3\/6 = 1\/2/);
 assert.match(steps[2].math,/12 − 4 = 8 см; 12 : 4 = 3/);
 assert.match(steps[2].note,/100 см : 25 см = 4/);
 assert.match(steps[3].math,/2 : 5 = 4 : 10 = 6 : 15/);
 assert.match(steps[4].understand,/всеми семью мерками/);
 assert.match(steps[4].math,/2\/7/);
 steps[0].check.answer='999';assert.equal(ratioSteps()[0].check.answer,'2');
});

test('interactive models preserve the counted amounts and distinguish inverse and additive comparisons',()=>{
 const grouped=session(0);interactWithRatio(grouped,'group');
 assert.deepEqual(ratioModel(grouped),{type:'groups',grouped:true,first:6,second:3});
 const order=session(1),before=ratioModel(order);interactWithRatio(order,'order');
 const after=ratioModel(order);
 assert.equal(before.first,before.second*2);
 assert.equal(after.first/before.second,1);assert.equal(after.second/before.first,1);
 assert.equal((before.first/before.second)*(after.first/after.second),1);
 const lengths=session(2);assert.equal(ratioModel(lengths).result,3);
 interactWithRatio(lengths,'measure');assert.equal(ratioModel(lengths).result,8);
});

test('recipe controls scale both quantities and distinguish a part-to-part ratio from a whole share',()=>{
 const recipe=session(3);
 for(const portions of [1,2,3]){
  assert.equal(interactWithRatio(recipe,'portions',portions),true);
  const m=ratioModel(recipe);assert.equal(m.first,2*portions);assert.equal(m.second,5*portions);
  assert.equal(m.first*5,m.second*2);
 }
 for(const invalid of [0,4,NaN,'bad'])assert.equal(interactWithRatio(recipe,'portions',invalid),false);
 assert.equal(ratioModel(recipe).portions,3);
 const share=session(4);assert.equal(ratioModel(share).second,5);
 interactWithRatio(share,'whole');assert.equal(ratioModel(share).second,7);assert.equal(ratioModel(share).first,2);
});

test('mini-checks accept numeric equivalents and reject the targeted misconceptions without scoring',()=>{
 const correct=['2','0,5','3','10','2/6'],wrong=['4','2','10','7','3/6'];
 for(let i=0;i<5;i++){
  const s=session(i);
  interactWithRatio(s,'check',wrong[i]);assert.equal(s.ratioExamples[i].correct,false);
  interactWithRatio(s,'reveal');assert.equal(s.ratioExamples[i].revealed,true);
  interactWithRatio(s,'check',correct[i]);assert.equal(s.ratioExamples[i].correct,true);
  assert.equal(s.ratioExamples[i].revealed,false);
  assert.deepEqual(s.answers,[{correct:true}]);assert.equal(s.wrongTries,2);assert.equal(s.index,1);
 }
});

test('example state and draft survive switching examples, storage and old active lessons',()=>{
 const original=globalThis.localStorage,values=new Map();globalThis.localStorage={setItem:(k,v)=>values.set(k,v),getItem:k=>values.get(k)};
 try{
  const data=defaultState();data.mode='student';const s=data.profiles.student.activeLesson=session(3);
  data.profiles.adult.progress.ratios={status:'learned'};
  interactWithRatio(s,'portions',3);interactWithRatio(s,'draft','10');
  s.conceptIndex=1;interactWithRatio(s,'order');s.conceptIndex=3;
  saveState(data);const restored=loadState();assert.deepEqual(restored,data);
  assert.equal(ratioModel(restored.profiles.student.activeLesson).second,15);
  assert.match(renderRatioLesson(restored.profiles.student.activeLesson),/value="10"/);
  assert.equal(ratioPosition({skillId:'ratios'}).index,0);
  for(const index of [-1,NaN,Infinity,'bad'])assert.equal(ratioPosition({conceptIndex:index}).index,0);
  assert.equal(ratioPosition({conceptIndex:99}).index,4);
 }finally{if(original===undefined)delete globalThis.localStorage;else globalThis.localStorage=original;}
});

test('ratio interaction is scoped to this concept lesson and escapes drafts',()=>{
 assert.equal(interactWithRatio({skillId:'ratios',phase:'practice'},'check','2'),false);
 assert.equal(interactWithRatio({skillId:'fraction-parts',phase:'concept'},'group'),false);
 const s=session(0);assert.equal(interactWithRatio(s,'portions',3),false);
 interactWithRatio(s,'draft','<img src=x onerror=alert(1)>');
 const html=renderRatioLesson(s);assert.doesNotMatch(html,/<img/);assert.match(html,/&lt;img/);
});

test('main exercises explicitly request numbers and preserve existing answer keys and prerequisites',()=>{
 const skill=SKILL_BY_ID.ratios;
 assert.deepEqual(skill.questions.map(q=>q.answer),['2','15','3']);
 for(const q of skill.questions)assert.match(q.text,/Введи число/);
 assert.match(skill.questions[1].text,/мерки|мерок/);
 assert.deepEqual(skill.prereq,['proportions','fraction-divide']);
});
