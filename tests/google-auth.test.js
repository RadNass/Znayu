import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {signInWithGoogle} from '../src/auth.js';

test('Google OAuth entry is provided by adult Supabase auth module',()=>{
 assert.equal(typeof signInWithGoogle,'function');
 const source=readFileSync(new URL('../src/auth.js',import.meta.url),'utf8');
 assert.match(source,/provider:'google'/);
 assert.match(source,/redirectTo:'https:\/\/radnass\.github\.io\/Znayu\/'/);
 assert.doesNotMatch(source,/sb_secret_|service_role/);
});
test('Znayu auth modal offers Google sign-in and handles the user click',()=>{
 const source=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(source,/data-auth="google"/);
 assert.match(source,/act==='google'/);
 assert.match(source,/startGoogleSignIn/);
});
