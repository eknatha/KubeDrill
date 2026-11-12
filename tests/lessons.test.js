// Lesson quality: schema, links, and every doit command must run in the simulator without errors.
const path=require('path'),fs=require('fs');
global.window=global;
const Sim=require('../assets/js/sim.js');['sim-shell','sim-kubectl','sim-kubectl2','sim-kubectl3','sim-faults','sim-faults2'].forEach(f=>require('../assets/js/'+f+'.js'));
const Labs=require('../assets/js/labs-engine.js');
for(const f of fs.readdirSync(path.join(__dirname,'../assets/js/data')).filter(x=>/^labs-sim-.*\.js$/.test(x))) require('../assets/js/data/'+f);
global.KL=global.KL||{};require('../assets/js/data/lessons-a.js');require('../assets/js/data/lessons-b.js');
const labIds=new Set(Labs.list.map(l=>l.id)), ids=KL.lessons.map(l=>l.id); let bad=0; const fail=(id,m)=>{bad++;console.log('✘',id,m)};
const mods=new Set(); const widgets=new Set(['steps','rollout','qos','matrix','tree','runbook','select']);
for(const l of KL.lessons){
  mods.add(l.mod);
  for(const k of ['id','mod','title','mins','why','model','remember','trap','prod','check']) if(!l[k]) fail(l.id,'missing '+k);
  if(!l.model||!l.model.analogy) fail(l.id,'no analogy');
  if(ids.filter(x=>x===l.id).length>1) fail(l.id,'duplicate id');
  (l.prereq||[]).forEach(p=>{if(!ids.includes(p))fail(l.id,'bad prereq '+p)});
  (l.breakit||[]).forEach(b=>{if(!labIds.has(b))fail(l.id,'bad lab '+b)});
  (l.check||[]).forEach((q,i)=>{if(!(q.a>=0&&q.a<q.o.length))fail(l.id,'check '+i+' answer out of range'); if(!q.w)fail(l.id,'check '+i+' no explanation')});
  [l.widget,l.model&&l.model.widget].filter(Boolean).forEach(w=>{if(!widgets.has(w.type))fail(l.id,'bad widget '+w.type)});
  if(l.widget&&l.model.widget&&l.widget.type!=='steps') fail(l.id,'two widgets');
  if(l.bug){const n=l.bug.yaml.split('\n').length; if(!(l.bug.line>=1&&l.bug.line<=n))fail(l.id,'bug line out of range'); if(!l.bug.why)fail(l.id,'bug no why')}
  if(l.anatomy){const lines=l.anatomy.yaml.split('\n'); Object.keys(l.anatomy.fields).forEach(k=>{const last=k.split('.').pop(); if(!lines.some(x=>x.indexOf(last+':')>=0)) fail(l.id,'anatomy field not in yaml: '+k)})}
  if(l.doit){const s=new Sim(); if(l.setup&&/^lab:/.test(l.setup)){const lab=Labs.list.find(x=>x.id===l.setup.slice(4)); Labs.setup(s,lab)}
    l.doit.forEach(st=>{let r; try{r=s.exec(st.cmd);s.settle(3)}catch(e){return fail(l.id,'throws: '+st.cmd)}
      const out=(r.stdout||'')+(r.stderr||''); if(r.code||/command not found|^error:|Error from server|unknown command/im.test(out)) fail(l.id,'"'+st.cmd+'" -> '+out.split('\n')[0]);
      if(st.predict&&!(st.answer>=0&&st.answer<st.predict.length))fail(l.id,'predict answer')});}
  if(l.explain){const r=new Sim().exec(l.explain.cmd); if(r.code) fail(l.id,'explain failed')}
}
if(mods.size<19) fail('all','modules covered: '+mods.size+'/19');
console.log(bad?bad+' lesson problem(s)':'all lessons OK ('+KL.lessons.length+' lessons, '+mods.size+' modules)'); process.exit(bad?1:0);
