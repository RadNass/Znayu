import test from 'node:test';
import assert from 'node:assert/strict';
import {gcd,simplify,parseNumber,checkAnswer,lessonScore} from '../src/math.js';

test('simplification and gcd',()=>{
 assert.equal(gcd(18,24),6);
 assert.deepEqual(simplify(10,20),{n:1,d:2});
 assert.deepEqual(simplify(5,-15),{n:-1,d:3});
 assert.equal(simplify(2,0),null);
});
test('fractions, decimals, negative and mixed numbers',()=>{
 assert.equal(parseNumber('3/4'),0.75);
 assert.equal(parseNumber('2 1/3'),7/3);
 assert.equal(parseNumber('-2 1/3'),-7/3);
 assert.equal(parseNumber('0,75'),0.75);
 assert.equal(parseNumber('4 часа'),4);
 assert.equal(parseNumber('8/0'),null);
 assert.equal(parseNumber('alert(1)'),null);
});
test('mathematically equivalent answers accepted',()=>{
 assert.equal(checkAnswer('2/4','1/2'),true);
 assert.equal(checkAnswer('0,50','1/2'),true);
 assert.equal(checkAnswer('4 2/3','14/3'),true);
 assert.equal(checkAnswer('1/3','1/2'),false);
 assert.equal(checkAnswer('>','>','compare'),true);
 assert.equal(checkAnswer('<','>','compare'),false);
 assert.equal(checkAnswer('1/0','1/2'),false);
});
test('lesson score only counts answers without help as independent',()=>{
 assert.deepEqual(lessonScore([{correct:true,usedHint:false,wrongTries:0},{correct:true,usedHint:true,wrongTries:0},{correct:true,usedHint:false,wrongTries:1},{correct:false}]),{correct:3,total:4,withoutHints:1});
});
