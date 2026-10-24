import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SKILL_BY_ID} from '../src/content.js';
import {LESSON_STAGES,firstLessonPhase,lessonStage,conceptSteps,questionPresentation,answerGuidance} from '../src/lesson-presentation.js';

test('understand-practice-consolidate stages work for new and old lessons',()=>{
 assert.deepEqual(LESSON_STAGES.map(x=>x.id),['concept','practice','consolidate']);
 assert.equal(firstLessonPhase('lesson',1),'concept');
 assert.equal(firstLessonPhase('lesson',2),'concept');
 assert.equal(firstLessonPhase('lesson',3),'practice');
 assert.equal(firstLessonPhase('lesson',4),'practice');
 assert.equal(firstLessonPhase('path',1),'concept');
 assert.equal(firstLessonPhase('review',1),'practice');
 assert.equal(lessonStage({phase:'concept',index:0},3),'concept');
 assert.equal(lessonStage({phase:'practice',index:0},3),'practice');
 assert.equal(lessonStage({phase:'practice',index:1},3),'practice');
 assert.equal(lessonStage({phase:'practice',index:2},3),'consolidate');
 assert.equal(lessonStage({index:1},3),'practice'); // existing persisted lessons are compatible
 assert.equal(lessonStage({index:2},4),'practice');
 assert.equal(lessonStage({index:3},4),'consolidate');
});
test('concept guides explain math through real, mathematically correct examples',()=>{
 const fraction=conceptSteps(SKILL_BY_ID['fraction-parts']);
 assert.equal(fraction.length,3);
 assert.equal(fraction[0].visual.parts,8);
 assert.equal(fraction[1].visual.filled,3);
 assert.match(fraction[2].math,/3\/8/);
 const addition=conceptSteps(SKILL_BY_ID['fraction-add']);
 assert.equal(addition.length,3);
 assert.match(addition.at(-1).math,/7\/12/);
 assert.doesNotMatch(addition.map(x=>x.text+' '+(x.math||'')).join(' '),/1\/4 \+ 1\/6/);
 const percent=conceptSteps(SKILL_BY_ID['percent-of']);
 assert.match(percent.at(-1).math,/30/);
 const binary=conceptSteps(SKILL_BY_ID.binary);
 assert.match(binary.at(-1).text,/числу 6/);
 const analytics=conceptSteps(SKILL_BY_ID['analyst-funnel']);
 assert.match(analytics.at(-1).math,/20%/);
 const finance=conceptSteps(SKILL_BY_ID['finance-interest']);
 assert.match(finance.at(-1).math,/1102,5/);
});
test('all curated concept and fallback instructions exist, without leaking question answers into state',()=>{
 for(const skill of Object.values(SKILL_BY_ID)){
  const steps=conceptSteps(skill);
  assert.equal(steps.length,['ratios','negative-concept'].includes(skill.id)?5:3,skill.id);
  for(const step of steps){
   assert.ok(step.title?.length>4,skill.id);
   assert.ok(step.text?.length>=9,skill.id);
   assert.ok(!Object.hasOwn(step,'answer'),skill.id+' is not quiz answer');
  }
  // Concept rendering must never mutate shared curriculum constants.
  const a=conceptSteps(skill);const b=conceptSteps(skill);
  assert.deepEqual(a,b);
 }
});
test('short calculations render prominently while word problems stay readable',()=>{
 const short=questionPresentation({text:'Вычисли 1/4 + 1/6.'});
 assert.deepEqual(short,{kind:'formula',instruction:'Вычисли выражение',expression:'1/4 + 1/6'});
 assert.equal(questionPresentation({text:'Вычисли 3 × 4.'}).kind,'formula');
 assert.equal(questionPresentation({text:'Какова конверсия в оплату, если 75 посетителей из 500 сделали покупку?'}).kind,'word');
 assert.equal(questionPresentation({text:'Пользователь увидел 20 событий, выбери среднее время'}).kind,'word');
});
test('answer field prompts vary by mathematical answer type',()=>{
 assert.match(answerGuidance({kind:'compare',text:'Введи знак',answer:'>'}).placeholder,/</);
 assert.equal(answerGuidance({kind:'number',text:'A=1, B=0. Чему равно A И B?',answer:'0'}).placeholder,'1 или 0');
 assert.match(answerGuidance({kind:'number',text:'Найди дробь',answer:'5/12'}).placeholder,/5\/12/);
 assert.equal(answerGuidance({kind:'number',text:'Вычисли 15 + 2',answer:'17'}).placeholder,'Введи ответ');
});
test('lessons show a progressive concept panel, rules on mobile, unobtrusive help',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
 assert.match(app,/function lessonConceptPage\(/);
 assert.match(app,/lessonStageNav\(session,pool.length\)/);
 assert.match(app,/data-action="concept-next"/);
 assert.match(app,/data-action="concept-skip"/);
 assert.match(app,/case 'concept-next'/);
 assert.match(app,/case 'toggle-help'/);
 assert.match(app,/case 'toggle-levels'/);
 assert.match(app,/lessonRuleCard\(s,prereq,'inline'/);
 assert.match(app,/lessonRuleCard\(s,prereq,'desktop'/);
 assert.match(app,/const pool=lessonQuestions\(session,s\)/);
 assert.match(app,/lessonStage\(session,pool.length\)/);
 assert.match(app,/answerDraft/);
 assert.match(app,/lesson-help-disclosure/);
 assert.match(app,/setupTutorVerification\(\)/);
 assert.match(css,/@media\(max-width:900px\).*?\.lesson-rule-inline\{display:block/s);
 assert.match(css,/@media\(max-width:900px\).*?\.lesson-sidebar\{display:none/s);
 assert.match(css,/\.lesson-v2-main \.lesson-word-task \.question\{font-size:17px/);
});
test('scoring and cloud hydration stay independent from presentation stages',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(app,/independent=session\.answers\.filter\(x=>x\.correct&&!x\.usedHint&&!x\.wrongTries\)/);
 assert.match(app,/learningPath:row\.adult_learning_path\|\|null/);
 assert.match(app,/profile\(\)\.activeLesson=null/);
 assert.match(app,/void trackAnalytics\('lesson_completed'/);
});

test('improper fractions and unchanged denominator are explicitly explained in mixed-number lesson',()=>{
 const mixed=SKILL_BY_ID['mixed-fractions'];
 assert.match(mixed.intro,/неправильная дробь/i);
 assert.match(mixed.intro,/числитель больше знаменателя или равен ему/);
 assert.match(mixed.intro,/Знаменатель 3 не меняется/);
 const steps=conceptSteps(mixed);
 assert.equal(steps.length,3);
 assert.match(steps[0].title,/неправильная дробь/);
 assert.match(steps[0].text,/3\/3/); // equality also counts as an improper fraction
 assert.match(steps[1].math,/6\/3/);
 assert.match(steps[1].text,/по-прежнему считаем трети/);
 assert.deepEqual(steps[2].visual,{parts:3,filled:7});
 assert.match(steps[2].math,/\(2 × 3 \+ 1\)\/3 = 7\/3/);
 assert.match(steps[2].text,/знаменатель остаётся 3/);
 assert.match(steps[2].why,/размер доли не менялся/);
 assert.match(mixed.questions[0].explain,/Знаменатель 2 остаётся/);
 assert.match(mixed.questions[1].explain,/Знаменатель 4 сохраняется/);
});
test('visual shows multiple equal wholes and displays the reason for keeping denominator',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
 assert.match(app,/lesson-fraction-stack/);
 assert.match(app,/Math\.ceil\(filled\/parts\)/);
 assert.match(app,/Знаменатель \$\{parts\} не меняется/);
 assert.match(app,/lesson-rule-why/);
 assert.match(css,/\.lesson-fraction-stack\{/);
 assert.match(css,/\.lesson-rule-why\{/);
});
