import test from 'node:test';
import assert from 'node:assert/strict';
import {SKILL_BY_ID} from '../src/content.js';
import {conceptSteps} from '../src/lesson-presentation.js';
import {negativeSteps,negativePosition,negativeModel,interactWithNegative,renderNegativeLesson,negativeTaskModel,renderNegativeTask,numberLine} from '../src/negative-lessons.js';
import {defaultState,saveState,loadState} from '../src/storage.js';

const ids=['negative-concept','negative-compare','negative-add','negative-subtract'];
const session=(skillId='negative-concept',conceptIndex=0)=>({skillId,conceptIndex,phase:'concept',index:1,answers:[{correct:true}],wrongTries:2,answerDraft:'saved'});

test('four negative-number guides teach fourteen complete examples, including zero and the two meanings of minus',()=>{
 assert.deepEqual(ids.map(id=>negativeSteps(id).length),[5,3,3,3]);
 for(const id of ids){
  assert.deepEqual(conceptSteps(SKILL_BY_ID[id]),negativeSteps(id));
  for(const step of negativeSteps(id))for(const field of ['title','text','understand','math','note'])assert.ok(step[field].length>5,`${id}: ${field}`);
 }
 const steps=negativeSteps('negative-concept');
 assert.match(steps[0].understand,/часть записи числа/);
 assert.match(steps[2].understand,/ни положительным, ни отрицательным/);
 assert.match(steps[3].understand,/Расстояние не бывает отрицательным/);
 assert.match(steps[4].note,/вычитание/);
 steps[0].visual.start=999;assert.equal(negativeSteps('negative-concept')[0].visual.start,-3);
 assert.deepEqual(negativeSteps('ratios'),[]);
});

test('all walks use unit steps in the right direction and stop at the arithmetic result',()=>{
 for(const id of ids)for(const [i,step] of negativeSteps(id).entries()){
  if(step.visual.type!=='move')continue;
  const s=session(id,i),{start,delta}=step.visual;
  for(let count=0;count<=Math.abs(delta);count++){
   const m=negativeModel(s);assert.equal(m.steps,count);assert.equal(m.current,start+Math.sign(delta)*count);
   if(count<Math.abs(delta))assert.equal(interactWithNegative(s,'step'),true);
  }
  assert.equal(negativeModel(s).current,start+delta);
  assert.equal(interactWithNegative(s,'step'),false);
  assert.match(renderNegativeLesson(s),/data-action="negative-step" disabled/);
  interactWithNegative(s,'reset');assert.equal(negativeModel(s).current,start);
  assert.deepEqual(s.answers,[{correct:true}]);assert.equal(s.index,1);assert.equal(s.wrongTries,2);assert.equal(s.answerDraft,'saved');
 }
});

test('thermometer crosses zero in both directions and cannot leave the labelled range',()=>{
 const s=session();
 for(let i=0;i<3;i++)interactWithNegative(s,'shift',1);
 assert.equal(negativeModel(s).current,0);assert.match(renderNegativeLesson(s),/Ни положительное, ни отрицательное/);
 for(let i=0;i<6;i++)interactWithNegative(s,'shift',1);
 assert.equal(negativeModel(s).current,6);assert.equal(interactWithNegative(s,'shift',1),false);
 for(let i=0;i<12;i++)interactWithNegative(s,'shift',-1);
 assert.equal(negativeModel(s).current,-6);assert.equal(interactWithNegative(s,'shift',-1),false);
 assert.equal(interactWithNegative(s,'shift','bad'),false);assert.equal(interactWithNegative(s,'shift',0),false);
 assert.match(renderNegativeLesson(s),/Температура −6 градусов Цельсия/);
});

test('opposites retain equal distance and comparisons keep both points even when selection changes',()=>{
 const opposite=session('negative-concept',3);const before=negativeModel(opposite);
 interactWithNegative(opposite,'select','second');const after=negativeModel(opposite);
 assert.equal(before.current,-after.current);assert.equal(Math.abs(before.current),Math.abs(after.current));
 const s=session('negative-compare',0);interactWithNegative(s,'select','second');
 assert.equal(negativeModel(s).current,-6);
 const html=renderNegativeLesson(s);assert.match(html,/Отмечены числа: −2, −6/);assert.match(html,/negative-selected/);
 assert.equal(interactWithNegative(s,'select','invalid'),false);
 const equal=renderNegativeLesson(session('negative-compare',2));assert.equal((equal.match(/<circle /g)||[]).length,1);
});

test('all mini-checks accept intended answers, reject wrong answers and never count toward mastery',()=>{
 for(const id of ids)for(const [i,step] of negativeSteps(id).entries()){
  const s=session(id,i);
  interactWithNegative(s,'check','999');assert.equal(s.negativeExamples[i].correct,false);
  assert.match(renderNegativeLesson(s),/Попробуй ещё раз/);
  interactWithNegative(s,'reveal');assert.equal(s.negativeExamples[i].revealed,true);
  interactWithNegative(s,'check',step.check.answer.replace('-','−'));assert.equal(s.negativeExamples[i].correct,true);
  assert.equal(s.negativeExamples[i].revealed,false);assert.match(renderNegativeLesson(s),/Верно!/);
  assert.deepEqual(s.answers,[{correct:true}]);assert.equal(s.wrongTries,2);
 }
 const s=session();interactWithNegative(s,'check','-4/2');assert.equal(s.negativeExamples[0].correct,true);
});

test('visual question models match all twelve existing answer keys, including reversed subtraction',()=>{
 for(const id of ids)for(const q of SKILL_BY_ID[id].questions){
  const m=negativeTaskModel(id,q);assert.ok(m,q.text);
  const expected=m.type==='move'?String(m.start+m.delta):m.type==='opposite'?String(m.b):m.a>m.b?'>':m.a<m.b?'<':'=';
  assert.equal(expected,q.answer,q.text);
  const before=renderNegativeTask(id,q,false),after=renderNegativeTask(id,q,true);
  assert.match(before,/Рисунок к условию/);assert.doesNotMatch(before,/Решение на рисунке|Движение от/);
  assert.match(after,/Решение на рисунке/);
  if(m.type==='move'){
   const end=String(m.start+m.delta).replace('-','−');
   assert.match(before,new RegExp(`Отмечены числа: ${String(m.start).replace('-','−')}\\.`));
   assert.match(after,new RegExp(`Отмечены числа: ${end}\\.`));
  }
 }
 assert.equal(renderNegativeTask('negative-add',{text:'Новая задача'},false),'');
 assert.equal(renderNegativeTask('ratios',SKILL_BY_ID['negative-concept'].questions[0]),'');
});

test('number line has equally spaced ticks, a distinct zero and does not mutate inputs',()=>{
 const options={points:[-7,2],min:-10,max:6};const copy=structuredClone(options),html=numberLine(options);
 const positions=[...html.matchAll(/<line x1="([\d.]+)"/g)].map(m=>Number(m[1]));
 assert.equal(positions.length,17);
 const spacing=positions[1]-positions[0];for(let i=1;i<positions.length;i++)assert.ok(Math.abs(positions[i]-positions[i-1]-spacing)<1e-9);
 assert.match(html,/negative-zero/);assert.match(html,/Один промежуток — одна единица/);assert.deepEqual(options,copy);
});

test('example navigation and mode storage retain independent drafts, walks and scored answers',()=>{
 const original=globalThis.localStorage,values=new Map();globalThis.localStorage={setItem:(k,v)=>values.set(k,v),getItem:k=>values.get(k)};
 try{
  const data=defaultState();data.mode='adult';
  const adult=data.profiles.adult.activeLesson=session('negative-concept',4);
  const student=data.profiles.student.activeLesson=session('negative-concept',0);
  interactWithNegative(adult,'step');interactWithNegative(adult,'step');interactWithNegative(adult,'draft','-3');
  interactWithNegative(student,'shift',-1);interactWithNegative(student,'draft','-2');
  adult.conceptIndex=0;interactWithNegative(adult,'shift',1);adult.conceptIndex=4;
  saveState(data);const restored=loadState();assert.deepEqual(restored,data);
  assert.equal(negativeModel(restored.profiles.adult.activeLesson).current,0);
  assert.equal(negativeModel(restored.profiles.student.activeLesson).current,-4);
  assert.match(renderNegativeLesson(restored.profiles.adult.activeLesson),/value="-3"/);
  assert.match(renderNegativeLesson(restored.profiles.student.activeLesson),/value="-2"/);
 }finally{if(original===undefined)delete globalThis.localStorage;else globalThis.localStorage=original;}
});

test('old sessions are bounded and invalid interactions and unsafe drafts cannot corrupt the lesson',()=>{
 for(const conceptIndex of [undefined,-1,NaN,Infinity,'bad'])assert.equal(negativePosition({skillId:'negative-concept',conceptIndex}).index,0);
 assert.equal(negativePosition({skillId:'negative-concept',conceptIndex:99}).index,4);
 const s=session();interactWithNegative(s,'draft','<img src=x onerror=alert(1)>');
 assert.doesNotMatch(renderNegativeLesson(s),/<img/);assert.match(renderNegativeLesson(s),/&lt;img/);
 const copy=structuredClone(s);assert.equal(interactWithNegative(s,'step'),false);assert.equal(interactWithNegative(s,'select','first'),false);assert.deepEqual(s,copy);
 assert.equal(interactWithNegative({...s,phase:'practice'},'shift',1),false);
 assert.equal(interactWithNegative({skillId:'ratios',phase:'concept'},'check',1),false);
 s.negativeExamples[0].current=999;assert.equal(negativeModel(s).current,-3);
});
