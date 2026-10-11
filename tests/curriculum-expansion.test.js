import test from 'node:test';
import assert from 'node:assert/strict';
import { MODULES, SKILLS, SKILL_BY_ID, skillsOf, ancestors } from '../src/content.js';
import { checkAnswer } from '../src/math.js';

test('expanded curriculum contains 72 unique skills in 13 modules', () => {
  assert.equal(MODULES.length, 13);
  assert.equal(SKILLS.length, 72);
  assert.equal(new Set(SKILLS.map(s => s.id)).size, SKILLS.length);
  assert.equal(new Set(MODULES.map(m => m.id)).size, MODULES.length);
  assert.equal(MODULES.reduce((count, m) => count + skillsOf(m.id).length, 0), SKILLS.length);
});

test('every skill includes three answerable exercises and a specific common error', () => {
  for (const skill of SKILLS) {
    assert.ok(skill.misconception?.length > 10, skill.id);
    assert.equal(skill.questions.length, 3, skill.id);
    for (const question of skill.questions) {
      assert.ok(question.text && question.hint && question.explain, skill.id);
      assert.ok(checkAnswer(question.answer, question.answer, question.kind), skill.id);
    }
  }
});

test('dependencies refer to existing skills and remain acyclic', () => {
  for (const skill of SKILLS) {
    for (const prerequisite of skill.prereq) {
      assert.ok(SKILL_BY_ID[prerequisite], `${skill.id}: ${prerequisite}`);
    }
    assert.ok(!ancestors(skill.id).some(s => s.id === skill.id), skill.id);
  }
});

test('new arithmetic, algebra, statistics and IT prerequisites are connected', () => {
  assert.ok(ancestors('linear-equations').some(s => s.id === 'whole-division'));
  assert.ok(ancestors('conditional-prob').some(s => s.id === 'fraction-parts'));
  assert.ok(ancestors('binary').some(s => s.id === 'place-value'));
});
