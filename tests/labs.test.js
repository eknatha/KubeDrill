// Runs every interactive lab: broken state must FAIL checks, applying the solution must PASS all tasks.
const path=require('path');
const Sim=require('../assets/js/sim.js');['sim-shell','sim-kubectl','sim-kubectl2','sim-kubectl3','sim-faults','sim-faults2'].forEach(f=>require('../assets/js/'+f+'.js'));
const Labs=require('../assets/js/labs-engine.js');
const fs=require('fs');
for(const f of fs.readdirSync(path.join(__dirname,'../assets/js/data')).filter(x=>/^labs-sim-.*\.js$/.test(x)).sort()) require('../assets/js/data/'+f);
global.KL=global.KL||{};require('../assets/js/data/debrief.js');require('../assets/js/data/debrief-j.js');
let bad=0, only=process.argv[2];
for(const l of Labs.list){ const d=(globalThis.KL.debrief||{})[l.id]; if(!d||d.length!==4||d.some(x=>!x)){bad++;console.log('✘ missing debrief',l.id);} }
for(const lab of Labs.list){
  if(only && lab.id.indexOf(only)<0) continue;
  const s=new Sim();
  try{ Labs.setup(s,lab);}catch(e){console.log('✘',lab.id,'SETUP:',e.message);bad++;continue;}
  const before=Labs.check(s,lab);
  const sol=lab.solution.join('\n');
  const r=s.exec(sol);
  s.settle(30);
  const after=Labs.check(s,lab);
  const errs=(r.stderr||'').trim();
  const allFailBefore=before.passed<before.total;
  if(!after.ok||!allFailBefore){bad++;console.log('✘',lab.id,'before',before.passed+'/'+before.total,'after',after.passed+'/'+after.total);
    after.tasks.forEach((t,i)=>t.results.forEach(x=>{if(!x.ok)console.log('    after FAIL task',t.id,x.msg)}));
    if(!allFailBefore) before.tasks.forEach(t=>{ if(t.ok) console.log('    already passing before: task',t.id)});
    if(errs)console.log('    stderr:',errs.split('\n').slice(0,4).join(' | '));
  } else console.log('✔',lab.id,before.passed+'/'+before.total,'→',after.passed+'/'+after.total, errs?('  (stderr: '+errs.split('\n')[0].slice(0,80)+')'):'');
}
console.log(bad?('\n'+bad+' lab(s) FAILED'):'\nall labs OK ('+Labs.list.length+')'); if (bad) process.exit(1);
// session persistence: dump mid-lab → JSON → fresh Sim.load → finish with the solution → must pass
{
  let bad2 = 0;
  for (const lab of Labs.list) {
    const a = new Sim(); Labs.setup(a, lab);
    const sol = lab.solution, half = Math.max(1, Math.floor(sol.length / 2));
    a.exec(sol.slice(0, half).join('\n')); a.settle(5);
    const b = new Sim().load(JSON.parse(JSON.stringify(a.dump())));
    b.exec(sol.slice(half).join('\n')); b.settle(30);
    const r = Labs.check(b, lab); if (!r.ok) { bad2++; console.log('✘ persist round-trip', lab.id, r.passed + '/' + r.total); }
  }
  console.log(bad2 ? bad2 + ' round-trip FAILURES' : 'persist round-trip OK (' + Labs.list.length + ' labs)'); if (bad2) process.exit(1);
}
