import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GENIUS_PROBLEMS,collatzExplore,goldbachExplore} from '../src/genius-problems.js';

test('the genius room contains verified research questions, not fabricated quizzes',()=>{
 assert.equal(GENIUS_PROBLEMS.length,6);
 assert.equal(new Set(GENIUS_PROBLEMS.map(p=>p.id)).size,6);
 for(const p of GENIUS_PROBLEMS){
  assert.ok(p.question.length>70,p.id);
  assert.match(p.source,/^https:\/\//);
  assert.ok(!Object.hasOwn(p,'answer'),'Open problem should never be auto-graded');
  assert.ok(!Object.hasOwn(p,'solution'),'Open problem should never have a fake solution');
 }
 assert.ok(GENIUS_PROBLEMS.some(p=>p.id==='collatz'));
 assert.ok(GENIUS_PROBLEMS.some(p=>p.id==='goldbach'));
 assert.ok(GENIUS_PROBLEMS.some(p=>p.id==='riemann'));
 assert.ok(GENIUS_PROBLEMS.some(p=>p.id==='p-np'));
});

test('Collatz playground explores finite examples but never certifies conjecture',()=>{
 assert.deepEqual(collatzExplore(1),{sequence:[1],finished:true,steps:0});
 const example=collatzExplore(7);
 assert.equal(example.finished,true);
 assert.equal(example.steps,16);
 assert.deepEqual(example.sequence.slice(0,4),[7,22,11,34]);
 assert.equal(example.sequence.at(-1),1);
 assert.throws(()=>collatzExplore(-1));
 assert.throws(()=>collatzExplore(100001));
 assert.throws(()=>collatzExplore(2.1));
});

test('Goldbach playground finds pairs for valid even examples',()=>{
 assert.deepEqual(goldbachExplore(4),{n:4,a:2,b:2,found:true});
 assert.deepEqual(goldbachExplore(28),{n:28,a:5,b:23,found:true});
 const pair=goldbachExplore(100);
 assert.equal(pair.a+pair.b,100);
 assert.throws(()=>goldbachExplore(3));
 assert.throws(()=>goldbachExplore(99));
 assert.throws(()=>goldbachExplore(100002));
});

test('genius card opens an accessible joke modal and research page',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(app,/data-action="open-genius"/);
 assert.match(app,/Ну ты и скромный!/);
 assert.match(app,/role="dialog" aria-modal="true" aria-labelledby="genius-dialog-title"/);
 assert.match(app,/case 'genius-enter':geniusVisible=false;go\('genius'\)/);
 assert.match(app,/case 'genius':c=geniusPage\(\)/);
 assert.match(app,/genius-collatz-form/);
 assert.match(app,/genius-goldbach-form/);
 assert.match(app,/Без оценок и проверенных ответов/);
});
