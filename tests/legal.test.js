import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LEGAL_PAGES,LEGAL_LINKS,legalPageById} from '../src/legal-content.js';
import {legalLinksHTML,legalDataPanelHTML,renderLegalPage} from '../src/legal-ui.js';
import {makeProgressExport,exportFilename,mayEraseLocalProfile} from '../src/user-data.js';

test('all seven legal resources are discoverable and explicitly labelled draft',()=>{
 assert.deepEqual(LEGAL_PAGES.map(page=>page.id),['about','free','terms','privacy','parents','licenses','data']);
 assert.equal(LEGAL_LINKS.length,7);
 for(const page of LEGAL_PAGES){
  assert.equal(page.draft,true);
  assert.ok(page.title.length>=8);
  assert.ok(page.sections.length>=2);
  assert.equal(legalPageById(page.id),page);
  const html=renderLegalPage(page.id,{mode:'adult',account:false,choice:'unset'});
  assert.match(html,/ЧЕРНОВИК · ТРЕБУЕТ ПРОВЕРКИ/);
  assert.match(html,/Документ не утверждён/);
  assert.match(html,/aria-current="page"/);
  assert.match(html,/legal-layout/);
 }
 assert.equal(legalPageById('unknown'),null);
 assert.match(legalLinksHTML(),/data-legal="privacy"/);
});

test('drafts are transparent about data location, operator, processing and children',()=>{
 const privacy=JSON.stringify(legalPageById('privacy'));
 const licenses=JSON.stringify(legalPageById('licenses'));
 assert.match(privacy,/ОПЕРАТОР|оператор|Оператор/i);
 assert.match(privacy,/Supabase/);
 assert.match(privacy,/не подтверждены|не подтверждён/);
 assert.match(privacy,/Cloudflare/);
 assert.match(privacy,/OpenAI|поставщик/);
 assert.match(privacy,/детского|школьного/);
 assert.match(licenses,/Ponyatno Math contributors/);
 assert.match(licenses,/MIT/);
 assert.match(JSON.stringify(legalPageById('free')),/без платы|бесплат/);
 assert.match(JSON.stringify(legalPageById('terms')),/финансовые|финансовой/);
});

test('export contains only the currently selected profile, not tokens or analytics identifiers',()=>{
 const adult={progress:{logic:{status:'learned'}},sessions:[{answers:[{answer:'42'}]}],reviews:[],activeLesson:{skillId:'logic'},learningPath:{steps:[]},challengeHistory:[{correct:4}]};
 const data=makeProgressExport('adult',adult,new Date('2026-10-15T00:00:00.000Z'));
 assert.equal(data.mode,'adult');
 assert.equal(data.format,'znayu-learning-profile-v1');
 assert.equal(data.progress.logic.status,'learned');
 assert.equal(data.sessions[0].answers[0].answer,'42');
 assert.equal(data.exported_at,'2026-10-15T00:00:00.000Z');
 assert.equal(data.user_id,undefined);
 assert.equal(data.token,undefined);
 assert.equal(data.visitor_id,undefined);
 assert.equal(exportFilename('student',new Date('2026-10-15T00:00:00.000Z')),'znayu-student-2026-10-15.json');
 assert.throws(()=>makeProgressExport('admin',{}));
});

test('local deletion is barred for cloud-connected adults',()=>{
 assert.equal(mayEraseLocalProfile('student',true),true);
 assert.equal(mayEraseLocalProfile('student',false),true);
 assert.equal(mayEraseLocalProfile('adult',false),true);
 assert.equal(mayEraseLocalProfile('adult',true),false);
 assert.match(legalDataPanelHTML({mode:'adult',account:true}),/disabled aria-disabled="true"/);
 assert.doesNotMatch(legalDataPanelHTML({mode:'student'}),/data-action="legal-analytics-toggle"/);
 assert.match(legalDataPanelHTML({mode:'adult',choice:'accepted'}),/Отозвать согласие/);
 assert.match(legalDataPanelHTML({mode:'adult',choice:'declined'}),/Разрешить статистику/);
});

test('legal routes are linked in app and signup, privacy controls are explicit',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(app,/case 'legal':c=renderLegalPage/);
 assert.match(app,/legalLinksHTML\(\)/);
 assert.match(app,/data-legal="terms"/);
 assert.match(app,/data-legal="privacy"/);
 assert.match(app,/case 'legal-export'/);
 assert.match(app,/case 'legal-erase-local'/);
 assert.match(app,/case 'legal-analytics-toggle'/);
 assert.match(app,/window\.confirm\('Удалить текущий локальный учебный профиль/);
 assert.match(app,/saveState\(state\);render\(\);toast\('Локальный профиль очищен\.'/);
 assert.match(app,/const allowed=\['home'/);
 assert.match(app,/,'legal'\]/);
});

test('deletion server code is guarded and not misleadingly activated in UI',()=>{
 const edge=readFileSync(new URL('../supabase/functions/delete-account/index.ts',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../src/legal-ui.js',import.meta.url),'utf8');
 assert.match(edge,/withSupabase\(\{auth:'user'\}/);
 assert.match(edge,/origin!==ALLOWED_ORIGIN/);
 assert.match(edge,/recentLogin\(authData\.user\.last_sign_in_at\)/);
 assert.match(edge,/ctx\.userClaims\?\.id\|\|ctx\.userClaims\?\.sub/);
 assert.match(edge,/confirmation!==CONFIRM/);
 assert.match(edge,/\.eq\('user_id',uid\)/);
 assert.match(edge,/\.eq\('auth_user_id',uid\)/);
 assert.match(edge,/auth\.admin\.deleteUser\(uid\)/);
 assert.doesNotMatch(ui,/data-action="delete-account-now"/);
 assert.match(ui,/не подключено/);
 const flow=readFileSync(new URL('../.github/workflows/pages.yml',import.meta.url),'utf8');
 assert.match(flow,/deploy:\n    needs: test/);
});
