import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../examples/remixes/orbital-rescue.html',import.meta.url),'utf8');
function game(){
 const nodes={game:{getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true}),getBoundingClientRect:()=>({left:0,width:600}),setPointerCapture(){}},status:{textContent:''},start:{},pause:{disabled:true}};
 const context=vm.createContext({document:{getElementById:id=>nodes[id]},requestAnimationFrame:()=>{},Math});
 vm.runInContext(source.match(/<script>([\s\S]*?)<\/script>/)[1],context,{timeout:1000});
 const run=code=>vm.runInContext(code,context,{timeout:1000});
 return {nodes,run};
}
test('rescue gameplay handles pickup, damage immunity, loss and clean restart',()=>{
 const {nodes,run}=game();nodes.start.onclick();
 run('pods=[{x:300,y:349}];frame(16)');assert.equal(run('rescued'),1);
 run('rocks=[{x:300,y:349,r:12},{x:300,y:349,r:12}];frame(32)');assert.equal(run('shields'),2);
 run('rocks=[{x:300,y:349,r:12}];frame(48)');assert.equal(run('shields'),2);
 run('invulnerable=0;rocks=[{x:300,y:349,r:12}];frame(64)');assert.equal(run('shields'),1);
 run('invulnerable=0;rocks=[{x:300,y:349,r:12}];frame(80)');assert.equal(run('running'),false);assert.match(nodes.status.textContent,/Mission ended.*1 pods/);
 nodes.start.onclick();assert.equal(run('shields'),3);assert.equal(run('rescued'),0);assert.equal(run('rocks.length+pods.length'),0);assert.equal(run('elapsed'),0);
});
test('pause freezes time, blur pauses, and survival completes at 45 seconds',()=>{
 const {nodes,run}=game();nodes.start.onclick();run('frame(16)');const before=run('elapsed');
 nodes.pause.onclick();run('frame(32)');assert.equal(run('elapsed'),before);
 nodes.pause.onclick();run('frame(48)');assert.ok(run('elapsed')>before);
 run('onblur()');assert.equal(run('paused'),true);
 nodes.pause.onclick();run('elapsed=44.99;rocks=[];frame(80)');assert.equal(run('elapsed'),45);assert.equal(run('running'),false);assert.match(nodes.status.textContent,/Mission complete/);
});
test('touch and keyboard keep the ship within the play area',()=>{
 const {nodes,run}=game();nodes.start.onclick();nodes.game.onpointermove({clientX:900});assert.equal(run('x'),585);
 nodes.game.onpointerdown({clientX:-50,pointerId:1});assert.equal(run('x'),15);
 run("keys.ArrowRight=true;frame(32)");assert.ok(run('x')>15);
});
