import test from 'node:test';
import assert from 'node:assert/strict';
import {formatMathText} from '../src/math-display.js';
test('simple fractions render vertically',()=>{
 const s=formatMathText('Сложи 1/4 + 1/6');
 assert.match(s,/math-frac/); assert.match(s,/>1<\/span>/);assert.match(s,/>4<\/span>/);
});
test('HTML is escaped in teacher content',()=>{
 const s=formatMathText('<script>alert(1)</script> 2/3 & 3/4');
 assert.ok(!s.includes('<script>'));assert.ok(s.includes('&lt;script&gt;'));assert.ok(s.includes('&amp;'));
});
test('slash-separated dates and URLs remain readable',()=>{
 assert.equal(formatMathText('2026/10/11'),'2026/10/11');
 assert.equal(formatMathText('https://example.com/1/2'),'https://example.com/1/2');
});
