import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SKILL_BY_ID} from '../src/content.js';
import {checkAnswer} from '../src/math.js';
import {DIFFICULTY_LABELS,CHALLENGE_SKILLS,availableLevels,clampLevel,questionsForLevel,difficultyState,recordLevelResult,createChallenge,recordChallengeAnswer,challengeResult} from '../src/difficulty.js';

test('seven IT skills have four meaningful, answerable difficulty levels',()=>{
 assert.equal(DIFFICULTY_LABELS.length,4);
 assert.equal(CHALLENGE_SKILLS.length,7);
 for(const id of CHALLENGE_SKILLS){
  const skill=SKILL_BY_ID[id];
  assert.ok(skill,'Missing '+id);
  assert.deepEqual(availableLevels(id),[1,2,3,4]);
  for(let level=1;level<=4;level++){
   const questions=questionsForLevel(skill,level);
   assert.equal(questions.length,level===1?3:4,id+' at level '+level);
   for(const q of questions){
    assert.ok(q.text.length>20,id+' has short task');
    assert.ok(q.hint.length>10,id+' has short hint');
    assert.ok(q.explain.length>15,id+' has short explanation');
    assert.ok(checkAnswer(q.answer,q.answer,q.kind),'Invalid answer '+id+' '+level+' '+q.answer);
   }
  }
 }
 assert.deepEqual(availableLevels('fraction-add'),[1]);
 assert.equal(clampLevel(4,'fraction-add'),1);
});

test('promotion needs two independently confident lessons',()=>{
 let state=difficultyState({},'binary');
 state=recordLevelResult(state,'binary',1,4,4);
 assert.equal(state.recommended,1);
 assert.equal(state.confirmed,0);
 state=recordLevelResult(state,'binary',1,3,4);
 assert.equal(state.recommended,2);
 assert.equal(state.selected,2);
 assert.equal(state.confirmed,1);
 state=recordLevelResult(state,'binary',2,3,4);
 assert.equal(state.recommended,2);
 state=recordLevelResult(state,'binary',2,4,4);
 assert.equal(state.recommended,3);
 assert.equal(state.selected,3);
 assert.equal(state.confirmed,2);
});

test('one poor lesson never lowers recommendation or erases confirmed level',()=>{
 let state={...difficultyState({},'logic'),selected:3,recommended:3,confirmed:2};
 state=recordLevelResult(state,'logic',3,1,4);
 assert.equal(state.recommended,3);
 assert.equal(state.confirmed,2);
 state=recordLevelResult(state,'logic',3,0,4);
 assert.equal(state.recommended,2);
 assert.equal(state.confirmed,2);
 assert.equal(state.selected,2);
});

test('challenge contains five distinct skill tasks without assistance',()=>{
 let challenge=createChallenge(4,0);
 assert.equal(challenge.questions.length,5);
 assert.equal(new Set(challenge.questions.map(x=>x.skillId)).size,5);
 for(const item of challenge.questions){
  assert.ok(item.question.explain.length>15);
  challenge=recordChallengeAnswer(challenge,item.question.answer,checkAnswer);
 }
 assert.deepEqual(challengeResult(challenge),{correct:5,total:5,percent:100});
 let miss=createChallenge(2,1);
 for(const item of miss.questions)miss=recordChallengeAnswer(miss,'не знаю',checkAnswer);
 assert.deepEqual(challengeResult(miss),{correct:0,total:5,percent:0});
});

test('skill levels survive serialization in the existing progress object',()=>{
 const progress={binary:{status:'learning',difficulty:{selected:3,recommended:3,confirmed:2,history:[]}},
 logic:{status:'learned',difficulty:{selected:1,recommended:1,confirmed:0,history:[]}}};
 const restored=JSON.parse(JSON.stringify(progress));
 assert.equal(difficultyState(restored,'binary').selected,3);
 assert.equal(difficultyState(restored,'logic').confirmed,0);
 assert.equal(Object.keys(restored).length,2);
});

test('UI allows level changes, challenge and old lesson fallbacks',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(app,/function levelChoicePanel\(/);
 assert.match(app,/case 'set-difficulty'/);
 assert.match(app,/case 'start-challenge'/);
 assert.match(app,/case 'challenge-run':c=challengeRunPage\(\)/);
 assert.match(app,/function lessonQuestions\(/);
 assert.match(app,/const pool=lessonQuestions\(session,s\)/);
 assert.doesNotMatch(app,/\$\{ses\.wrongTries/);
});
