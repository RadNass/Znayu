import test from 'node:test';
import assert from 'node:assert/strict';
import {SKILL_BY_ID} from '../src/content.js';
import {checkAnswer,parseNumber} from '../src/math.js';
import {defaultState,saveState,loadState} from '../src/storage.js';
import {FRACTION_EXAMPLES,fractionExamples,fractionBars,fractionPosition,moveFractionExample} from '../src/fraction-examples.js';
import {interactWithFraction,renderFractionExamples} from '../src/fraction-examples-ui.js';

test('nine existing fraction lessons have 3–5 complete, independent guided examples',()=>{
 assert.equal(Object.keys(FRACTION_EXAMPLES).length,9);
 for(const [skillId,examples] of Object.entries(FRACTION_EXAMPLES)){
  assert.ok(SKILL_BY_ID[skillId]);
  assert.ok(examples.length>=3&&examples.length<=5,skillId);
  assert.equal(new Set(examples.map(e=>e.title)).size,examples.length);
  for(const e of examples){
   for(const key of ['title','see','understand','math'])assert.ok(e[key].length>2,`${skillId}: ${key}`);
   for(const key of ['text','hint','explain'])assert.ok(e.check[key].length>5);
   assert.ok(checkAnswer(e.check.answer,e.check.answer,e.check.kind));
   assert.equal(checkAnswer('не знаю',e.check.answer,e.check.kind),false);
  }
  const copy=fractionExamples(skillId);copy[0].bars[0].filled=999;
  assert.notEqual(fractionExamples(skillId)[0].bars[0].filled,999);
 }
});

test('common grids preserve exact rational areas and use equal-size cells, including whole and improper fractions',()=>{
 for(const examples of Object.values(FRACTION_EXAMPLES))for(const e of examples){
  const original=fractionBars(e,false,true),grid=fractionBars(e,true,true);
  for(let i=0;i<grid.length;i++){
   const before=original[i],after=grid[i];
   assert.equal(before.filled*after.parts,after.filled*before.parts,e.title);
   assert.ok(Number.isInteger(after.parts)&&after.parts>0);
   assert.ok(Number.isInteger(after.filled)&&after.filled>=0);
   assert.equal(after.parts,grid[0].parts);
  }
 }
});

test('comparison signs and arithmetic result illustrations agree with their input fractions',()=>{
 for(const e of fractionExamples('fraction-compare')){
  const [a,b]=e.bars,expected=a.filled*b.parts-b.filled*a.parts;
  assert.equal(e.math.split(' ')[1],expected===0?'=':expected>0?'>':'<');
 }
 for(const id of ['fraction-add-same','fraction-add','fraction-subtract'])for(const e of fractionExamples(id)){
  const [a,b]=e.bars,r=e.result;
  const expected=a.filled/a.parts+(id==='fraction-subtract'?-1:1)*b.filled/b.parts;
  assert.ok(Math.abs(expected-r.filled/r.parts)<1e-12,e.title);
  assert.ok(Math.abs(parseNumber(e.math.split(' = ').at(-1))-expected)<1e-12);
 }
});

test('navigation covers every example in order, goes back across boundaries and ends in existing practice',()=>{
 const session={skillId:'fraction-parts',phase:'concept',conceptIndex:0,index:1,answers:[{correct:true}],wrongTries:2};
 for(let position=0;position<20;position++){
  const {index,step}=fractionPosition(session);
  assert.equal(index,Math.floor(position/4));assert.equal(step,position%4);
  assert.ok(renderFractionExamples(session).includes(`Пример ${index+1} из 5`));
  if(position===4){
   moveFractionExample(session,-1);assert.equal(session.fractionExampleIndex,0);assert.equal(session.conceptIndex,3);
   moveFractionExample(session,1);
  }
  moveFractionExample(session,1);
 }
 assert.equal(session.phase,'practice');assert.equal(session.index,1);
 assert.deepEqual(session.answers,[{correct:true}]);assert.equal(session.wrongTries,2);
 assert.equal(moveFractionExample(session,1),false);
 assert.deepEqual(fractionPosition({skillId:'fraction-parts',conceptIndex:NaN,fractionExampleIndex:-4}).index,0);
 const old={skillId:'fraction-parts',phase:'concept'};
 moveFractionExample(old,1);assert.equal(old.conceptIndex,1);
 assert.equal(moveFractionExample({skillId:'binary',phase:'concept'},1),false);
});

test('painting, retries and worked solutions do not modify quiz answers or mastery',()=>{
 const session={skillId:'fraction-parts',phase:'concept',conceptIndex:0,index:0,answers:[],correct:false,wrongTries:0};
 assert.ok(interactWithFraction(session,'tile',0));
 assert.deepEqual(session.fractionInteraction.selected,[0]);
 interactWithFraction(session,'tile',0);assert.deepEqual(session.fractionInteraction.selected,[]);
 assert.equal(interactWithFraction(session,'tile',99),false);
 session.conceptIndex=3;
 interactWithFraction(session,'check','9');assert.equal(session.fractionInteraction.correct,false);
 interactWithFraction(session,'check','4/2');assert.equal(session.fractionInteraction.correct,true);
 interactWithFraction(session,'reveal');assert.equal(session.fractionInteraction.revealed,true);
 assert.deepEqual(session.answers,[]);assert.equal(session.correct,false);assert.equal(session.wrongTries,0);
 session.phase='practice';assert.equal(interactWithFraction(session,'check','2'),false);
});

test('all mini-checks accept correct answers, reject mistakes and safely render typed HTML',()=>{
 for(const [skillId,examples] of Object.entries(FRACTION_EXAMPLES))for(let i=0;i<examples.length;i++){
  const s={skillId,phase:'concept',fractionExampleIndex:i,conceptIndex:3};
  interactWithFraction(s,'check','<script>alert(1)</script>');
  assert.equal(s.fractionInteraction.correct,false);
  const html=renderFractionExamples(s);assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));
  interactWithFraction(s,'check',examples[i].check.answer);assert.equal(s.fractionInteraction.correct,true);
 }
});

test('existing storage round-trips example, step, grid and draft without erasing either profile',()=>{
 const values=new Map();globalThis.localStorage={setItem:(k,v)=>values.set(k,v),getItem:k=>values.get(k)};
 try{
  const state=defaultState();state.mode='adult';state.profiles.student.progress={'fraction-parts':{status:'learned'}};
  state.profiles.adult.activeLesson={skillId:'fraction-compare',phase:'concept',fractionExampleIndex:4,conceptIndex:2,index:1,answers:[{correct:true}]};
  interactWithFraction(state.profiles.adult.activeLesson,'grid');
  saveState(state);
  const loaded=loadState();assert.deepEqual(loaded,state);
  assert.match(renderFractionExamples(loaded.profiles.adult.activeLesson),/Исходная сетка/);
  moveFractionExample(loaded.profiles.adult.activeLesson,1);
  interactWithFraction(loaded.profiles.adult.activeLesson,'check','<');saveState(loaded);
  assert.equal(loadState().profiles.adult.activeLesson.fractionInteraction.answer,'<');
  assert.equal(loadState().profiles.student.progress['fraction-parts'].status,'learned');
 }finally{delete globalThis.localStorage;}
});

test('improper diagrams retain whole width and unequal pieces are explicitly distinguished',()=>{
 const html=renderFractionExamples({skillId:'mixed-fractions',phase:'concept',fractionExampleIndex:1,conceptIndex:0});
 assert.equal((html.match(/class="fraction-whole"/g)||[]).length,3);
 assert.match(html,/Целое 3: 1 из 3/);
 const unequal={skillId:'fraction-parts',phase:'concept',fractionExampleIndex:4,conceptIndex:0};
 assert.match(renderFractionExamples(unequal),/grid-column:span 2/);
 interactWithFraction(unequal,'grid');assert.doesNotMatch(renderFractionExamples(unequal),/grid-column:span 2/);
});
