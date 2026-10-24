import test from 'node:test';
import assert from 'node:assert/strict';
import {SKILL_BY_ID} from '../src/content.js';
import {conceptSteps} from '../src/lesson-presentation.js';
import {ratioSteps,ratioPosition,ratioModel,interactWithRatio,renderRatioLesson,ratioSkillForMode} from '../src/ratio-lesson.js';
import {questionsForLevel} from '../src/difficulty.js';
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

test('adults get five everyday examples with matching visuals, units and feedback',()=>{
 const adult=ratioSteps('adult'),school=ratioSteps('student');
 assert.equal(adult.length,5);
 const expected=[/бутерброд/i,/чашк/i,/кабел/i,/кофе/i,/транспорт/i];
 for(let i=0;i<5;i++){
  assert.notEqual(adult[i].text,school[i].text);
  const s=session(i);interactWithRatio(s,'check',adult[i].check.answer,'adult');
  assert.equal(s.ratioExamples[i].correct,true);
  const html=renderRatioLesson(s,'adult');assert.match(html,expected[i]);assert.match(html,/Верно!/);
  assert.doesNotMatch(html,/фишк|сироп/i);
  assert.match(renderRatioLesson(s,'student'),i<2?/фишк/:i===2?/лент/:/сироп/i);
 }
 assert.match(renderRatioLesson(session(2),'adult'),/12 м/);
 assert.match(renderRatioLesson(session(2),'student'),/12 см/);
 adult[0].check.answer='999';assert.equal(ratioSteps('adult')[0].check.answer,'2');
});

test('adult interactions show reciprocal ratios, scaled recipes and the correct total for spending',()=>{
 const order=session(1);interactWithRatio(order,'order',undefined,'adult');
 assert.match(renderRatioLesson(order,'adult'),/Чашки чая : бутерброды = 3 : 6 = 1 : 2/);
 const recipe=session(3);interactWithRatio(recipe,'portions',3,'adult');
 assert.match(renderRatioLesson(recipe,'adult'),/Кофе: 6 мерок. Молоко: 15 мерок/);
 const share=session(4);interactWithRatio(share,'whole',undefined,'adult');
 assert.match(renderRatioLesson(share,'adult'),/Транспорт : все расходы = 2 : 7/);
 interactWithRatio(share,'check','1/2','adult');assert.equal(share.ratioExamples[4].correct,false);
 interactWithRatio(share,'check','3/9','adult');assert.equal(share.ratioExamples[4].correct,true);
 assert.deepEqual(share.answers,[{correct:true}]);
});

test('adult practice adapts situations without mutating school curriculum or existing question snapshots',()=>{
 const original=structuredClone(SKILL_BY_ID.ratios),saved={questionSet:structuredClone(original.questions)};
 const adult=ratioSkillForMode(SKILL_BY_ID.ratios,'adult');
 const questions=questionsForLevel(adult,1);
 assert.deepEqual(questions.map(q=>q.answer),['2','15','3']);
 assert.match(questions[0].text,/бутерброд/i);assert.match(questions[1].text,/кофе/);assert.match(questions[2].text,/кабел/);
 assert.deepEqual(SKILL_BY_ID.ratios,original);assert.deepEqual(saved.questionSet,original.questions);
 assert.equal(ratioSkillForMode(SKILL_BY_ID.ratios,'student'),SKILL_BY_ID.ratios);
 assert.equal(ratioSkillForMode(SKILL_BY_ID['fraction-parts'],'adult'),SKILL_BY_ID['fraction-parts']);
});

test('adult and student examples retain separate drafts and illustrations through storage',()=>{
 const original=globalThis.localStorage,values=new Map();globalThis.localStorage={setItem:(k,v)=>values.set(k,v),getItem:k=>values.get(k)};
 try{
  const data=defaultState();data.mode='adult';
  data.profiles.adult.activeLesson=session(3);data.profiles.student.activeLesson=session(0);
  interactWithRatio(data.profiles.adult.activeLesson,'portions',3,'adult');
  interactWithRatio(data.profiles.adult.activeLesson,'draft','10','adult');
  interactWithRatio(data.profiles.student.activeLesson,'group',undefined,'student');
  interactWithRatio(data.profiles.student.activeLesson,'draft','2','student');
  saveState(data);const loaded=loadState();
  assert.match(renderRatioLesson(loaded.profiles.adult.activeLesson,'adult'),/Кофе: 6 мерок/);
  assert.match(renderRatioLesson(loaded.profiles.adult.activeLesson,'adult'),/value="10"/);
  assert.match(renderRatioLesson(loaded.profiles.student.activeLesson,'student'),/2 красные и 1 синяя/);
  assert.match(renderRatioLesson(loaded.profiles.student.activeLesson,'student'),/value="2"/);
 }finally{if(original===undefined)delete globalThis.localStorage;else globalThis.localStorage=original;}
});
