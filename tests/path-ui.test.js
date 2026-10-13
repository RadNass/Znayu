import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
test('Personal learning path is reachable from main navigation and deep link',()=>{
 assert.match(app,/id:'path',label:'Мой маршрут'/);
 assert.match(app,/case 'path':c=personalPathPage\(\)/);
 assert.match(app,/function personalPathPage\(\)/);
});
test('Repeated mistakes offer targeted foundation diagnosis',()=>{
 assert.match(app,/session\.wrongTries>=2&&!done/);
 assert.match(app,/data-action="diagnose-skill"/);
});
test('Adult cloud path can be hydrated without clearing student data',()=>{
 assert.match(app,/learningPath:row\.adult_learning_path\|\|null/);
 assert.match(app,/state\.profiles\.adult=/);
});
