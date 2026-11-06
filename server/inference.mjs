import model from './model.json' with { type: 'json' };
export { model };
const w = model.weights;
const add = (a,b) => a.map((x,i)=>x+b[i]);
const linear = (x,weight,bias) => weight.map((row,i)=>row.reduce((v,k,j)=>v+k*x[j],bias?.[i]||0));
const norm = (x,p) => { const mean=x.reduce((a,b)=>a+b)/x.length; const sd=Math.sqrt(x.reduce((a,b)=>a+(b-mean)**2,0)/x.length+1e-5); return x.map((v,i)=>(v-mean)/sd*w[p+'.weight'][i]+w[p+'.bias'][i]); };
const softmax = x => { const max=Math.max(...x); const exp=x.map(v=>Math.exp(v-max)); const sum=exp.reduce((a,b)=>a+b); return exp.map(v=>v/sum); };
// PyTorch GELU uses the exact error function by default.
const erf = x => { const s=Math.sign(x); x=Math.abs(x); const t=1/(1+0.3275911*x); return s*(1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x)); };
const gelu = x => x*.5*(1+erf(x/Math.SQRT2));
export function features(r) {
 const v=r.voltage,c=r.current,p=r.power,e=r.energy_consumed,d=Math.max(1,r.charging_duration),pack=r.network_packet_count/(d*60+1),expected=p*d/60;
 return Object.fromEntries(model.features.map((k,i)=>[k,[v/450,c/200,p/150,e/100,Math.abs(v-(v>300?400:230))/(v>300?400:230),Math.abs(expected-e)/(Math.max(e,expected)+.1),pack,r.request_frequency,r.response_time,1-r.authentication_status,r.command_frequency,r.data_integrity_score,r.request_frequency/25+r.response_time/250+pack/15,d,Math.max(0,model.protocols.indexOf(r.protocol_message_type)),Math.min(1.5,p/150)][i]]));
}
export function predict(r) {
 const f=features(r); const x=model.features.map((k,i)=>(f[k]-model.mean[i])/model.scale[i]);
 let tokens=[w['tokenizer.cls_token'][0][0],...x.map((v,i)=>linear([v],w[`tokenizer.feature_projections.${i}.weight`],w[`tokenizer.feature_projections.${i}.bias`]))].map((v,i)=>add(v,w['tokenizer.feature_embeddings'][0][i]));
 let attention;
 for(let layer=0;layer<2;layer++) {
  const p=`layers.${layer}`; const qkv=tokens.map(t=>linear(t,w[p+'.self_attn.in_proj_weight'],w[p+'.self_attn.in_proj_bias']));
  const allAttention=[];
  const outputs=tokens.map((_,i)=>{
   const out=[]; const heads=[];
   for(let h=0;h<4;h++) {
    const a=softmax(tokens.map((_,j)=>{let sum=0;for(let k=0;k<8;k++)sum+=qkv[i][h*8+k]*qkv[j][32+h*8+k];return sum/Math.sqrt(8);}));
    heads.push(a);
    for(let k=0;k<8;k++)out.push(a.reduce((sum,v,j)=>sum+v*qkv[j][64+h*8+k],0));
   }
   allAttention.push(heads);
   return linear(out,w[p+'.self_attn.out_proj.weight'],w[p+'.self_attn.out_proj.bias']);
  });
  attention=tokens.slice(1).map((_,j)=>allAttention[0].reduce((s,h)=>s+h[j+1],0)/4);
  tokens=tokens.map((t,i)=>norm(add(t,outputs[i]),p+'.norm1'));
  tokens=tokens.map(t=>norm(add(t,linear(linear(t,w[p+'.linear1.weight'],w[p+'.linear1.bias']).map(gelu),w[p+'.linear2.weight'],w[p+'.linear2.bias'])),p+'.norm2'));
 }
 const probs=softmax(linear(linear(norm(tokens[0],'head.0'),w['head.1.weight'],w['head.1.bias']).map(gelu),w['head.4.weight'],w['head.4.bias']));
 const index=probs.indexOf(Math.max(...probs)),sum=attention.reduce((a,b)=>a+b);
 return { prediction:model.classes[index],confidence:+(probs[index]*100).toFixed(2),probabilities:Object.fromEntries(model.classes.map((c,i)=>[c,+(probs[i]*100).toFixed(2)])),attention_weights:Object.fromEntries(model.features.map((c,i)=>[c,+(attention[i]/sum*100).toFixed(2)])),features:f };
}
export function generate(attack='NORMAL',stationId) {
 const voltage=stationId==='EV-CS-03'||stationId==='EV-CS-05'?230:400,current=25+Math.random()*30,power=voltage*current/1000,duration=30+Math.random()*40;
 const r={timestamp:new Date().toISOString(),charging_station_id:stationId||model.stations[Math.floor(Math.random()*6)].id,ev_id:'EV-'+Math.floor(1000+Math.random()*9000),session_id:crypto.randomUUID(),voltage,current,power,energy_consumed:power*duration/60,charging_duration:duration,network_packet_count:200,request_frequency:2,response_time:40,authentication_status:1,command_frequency:5,data_integrity_score:.99,ip_device_identifier:'192.168.1.10',protocol_message_type:'OCPP_MeterValues',session_status:'Active',attack_label:attack};
 if(attack==='DoS ATTACK')Object.assign(r,{request_frequency:350,response_time:650,network_packet_count:35000});
 if(attack==='DATA TAMPERING')Object.assign(r,{data_integrity_score:.35,energy_consumed:power*duration/60*3,voltage:voltage*1.3});
 if(attack==='UNAUTHORIZED ACCESS')Object.assign(r,{authentication_status:0,protocol_message_type:'OCPP_Authorize',request_frequency:45});
 if(attack==='MALWARE ACTIVITY')Object.assign(r,{command_frequency:85,protocol_message_type:'OCPP_FirmwareUpdate',data_integrity_score:.75});
 return r;
}
export function validate(input) {
 const r={...generate('NORMAL','EV-CS-01'),...input};
 if(!model.stations.some(s=>s.id===r.charging_station_id))throw new Error('Unknown charging station');
 for(const k of ['voltage','current','power','energy_consumed','charging_duration','network_packet_count','request_frequency','response_time','authentication_status','command_frequency','data_integrity_score']) { if(r[k]===''||r[k]===null||!Number.isFinite(Number(r[k]))||Number(r[k])<0)throw new Error(`Invalid ${k}`);r[k]=Number(r[k]); }
 if(![0,1].includes(r.authentication_status)||r.data_integrity_score>1)throw new Error('Invalid authentication status or integrity score');
 if(!model.protocols.includes(r.protocol_message_type))throw new Error('Unknown protocol message type');
 return r;
}
