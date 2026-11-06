import { db } from '../../db/index.js';
import { events, stations } from '../../db/schema.js';
import { eq, desc, sql } from 'drizzle-orm';
import { generate, predict, validate, model } from '../../server/inference.mjs';
import metrics from '../../backend/models/weights/metrics.json' with { type: 'json' };
import Papa from 'papaparse';
const responses = {
 'NORMAL':'Continue monitoring station telemetry.',
 'DoS ATTACK':'Rate-limit station ingress and isolate the affected OCPP connection.',
 'DATA TAMPERING':'Verify meter readings and message integrity before accepting telemetry.',
 'UNAUTHORIZED ACCESS':'Revoke suspicious sessions and review station credentials.',
 'MALWARE ACTIVITY':'Isolate the controller and verify firmware against a trusted image.',
};
const success = data => Response.json({status:'success',data});
const csv = (rows,name) => new Response(Papa.unparse(rows.map(row=>Object.fromEntries(Object.entries(row).map(([k,v])=>[k,typeof v==='string'&&/^[=+@\-\t\r]/.test(v)?"'"+v:v])))),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="${name}.csv"`}});
async function seed() {
 await db.insert(stations).values(model.stations.map((s,i)=>({id:s.id,data:{id:s.id,name:s.name,station_type:s.type,max_power:s.max_power,current_power:0,current_voltage:s.type.includes('AC')?230:400,current_current:0,status:'NORMAL',active_sessions:1,total_energy_kwh:0,network_packets_total:0,last_attack_type:'NONE',updated_at:new Date().toISOString()}}))).onConflictDoNothing();
}
async function processRecords(records) {
 const results=records.map(raw=>{
  const result=predict(raw),severity=result.prediction==='NORMAL'?'LOW':['DoS ATTACK','MALWARE ACTIVITY'].includes(result.prediction)?'CRITICAL':'HIGH';
  const triggered=Object.entries(result.attention_weights).sort((a,b)=>Number(b[1])-Number(a[1])).slice(0,4).map(([k])=>k).join(', ');
  const alert=result.prediction==='NORMAL'?null:{id:'ALT-'+crypto.randomUUID(),timestamp:raw.timestamp,station_id:raw.charging_station_id,detected_attack_type:result.prediction,confidence_score:result.confidence,severity,triggered_features:triggered,recommended_response:responses[result.prediction],status:'ACTIVE'};
  return {...result,raw_telemetry:raw,severity,alert,pipeline_trace:{stage_1_injection:raw,stage_2_analysis:{request_frequency:raw.request_frequency,response_time_ms:raw.response_time,network_packets:raw.network_packet_count,auth_status:raw.authentication_status,command_frequency:raw.command_frequency,data_integrity:raw.data_integrity_score},stage_3_features:result.features,stage_4_transformer:{...result,top_attention_features:Object.entries(result.attention_weights).map(([feature,weight])=>({feature,weight})).sort((a,b)=>Number(b.weight)-Number(a.weight)).slice(0,5)},stage_5_alert:alert}};
 });
 await db.transaction(async tx=>{
  await tx.insert(events).values(results.map(data=>({stationId:data.raw_telemetry.charging_station_id,data})));
  for(const result of results) {
   const r=result.raw_telemetry;
   await tx.update(stations).set({data:sql`${stations.data} || ${JSON.stringify({current_power:r.power,current_voltage:r.voltage,current_current:r.current,status:result.alert?'UNDER_ATTACK':'NORMAL',last_attack_type:result.prediction,updated_at:r.timestamp})}::jsonb || jsonb_build_object('network_packets_total', COALESCE((${stations.data}->>'network_packets_total')::numeric,0) + ${r.network_packet_count}, 'total_energy_kwh', ${r.energy_consumed})`}).where(eq(stations.id,r.charging_station_id));
  }
 });
 return results;
}
export default async (req:Request) => {
 const url=new URL(req.url),path=url.pathname.replace(/\/$/,''),q=url.searchParams;
 try {
 if(path==='/api/status')return success({status:'ONLINE',ai_engine:'ONLINE',model_loaded:true,mode:'Prototype / Simulated Data',evaluation_disclosure:'Prototype evaluation on synthetic dataset'});
 if(path==='/api/model/info'&&req.method==='GET')return success(metrics);
 if(path==='/api/model/retrain')return Response.json({status:'error',detail:'Training requires the local Python environment. Run python run_server.py locally to retrain and export updated weights.'},{status:501});
 if(path.startsWith('/api/telemetry/download-')&&req.method==='GET')return csv(Array.from({length:path.endsWith('sample')?100:2000},(_,i)=>generate(model.classes[i%5])), 'ev_telemetry');
 await seed();
 if(['/api/telemetry/simulate','/api/telemetry/inject','/api/telemetry/upload-csv'].includes(path)&&req.method==='POST') {
  let records;
  if(path.endsWith('simulate')) {
   const attack=q.get('attack_type')||'RANDOM',station=q.get('station_id');
   if(attack!=='RANDOM'&&!model.classes.includes(attack))return Response.json({status:'error',detail:'Invalid attack type'},{status:400});
   records=[validate(generate(attack==='RANDOM'?model.classes[Math.floor(Math.random()*5)]:attack,station))];
  } else if(path.endsWith('inject')) records=[validate(await req.json())];
  else {
   const form=await req.formData(),file=form.get('file');
   if(!(file instanceof File)||!file.name.toLowerCase().endsWith('.csv')||file.size>2_000_000)throw new Error('Upload a CSV file smaller than 2 MB');
   const parsed=Papa.parse(await file.text(),{header:true,skipEmptyLines:'greedy'});
   if(parsed.errors.length||!parsed.data.length)throw new Error('CSV is empty or malformed');
   if(!parsed.meta.fields?.includes('voltage')||!parsed.meta.fields?.includes('charging_station_id'))throw new Error('CSV must include voltage and charging_station_id columns');
   records=parsed.data.slice(0,250).map(validate);
  }
  const results=await processRecords(records);
  if(path.endsWith('upload-csv'))return Response.json({status:'success',processed_records:results.length,threats_detected:results.filter(r=>r.alert).length,breakdown:Object.fromEntries(model.classes.map(c=>[c,results.filter(r=>r.prediction===c).length]))});
  return success(results[0]);
 }
 if(['/api/logs/clear','/api/alerts/clear'].includes(path)&&req.method==='DELETE') {
  await db.transaction(async tx=>{
   await tx.update(events).set({data:sql`${events.data} || '{"cleared":true}'::jsonb`});
   await tx.update(stations).set({data:sql`${stations.data} || '{"status":"NORMAL","last_attack_type":"NONE"}'::jsonb`});
  });
  return success({message:'Security logs and alerts cleared.'});
 }
 if(req.method!=='GET')return new Response('Method not allowed',{status:405});
 const stationRows=(await db.select().from(stations).orderBy(stations.id)).map(s=>s.data);
 const rows=await db.select().from(events).orderBy(desc(events.id)).limit(2000);
 const alerts=rows.filter(e=>!e.data.cleared&&e.data.alert).map(e=>e.data.alert);
 const logs=rows.filter(e=>!e.data.cleared).map(e=>({id:e.id,timestamp:e.data.raw_telemetry.timestamp,station_id:e.stationId,event_type:'TELEMETRY_EVALUATION',prediction:e.data.prediction,confidence:e.data.confidence,severity:e.data.severity,status:e.data.alert?'FLAGGED':'PASSED',details:responses[e.data.prediction]}));
 if(path==='/api/analytics/overview') {
  const counts=await db.select({prediction:sql<string>`${events.data}->>'prediction'`,count:sql<number>`count(*)::int`}).from(events).groupBy(sql`${events.data}->>'prediction'`);
  return success({kpis:{total_stations:stationRows.length,active_sessions:stationRows.reduce((s,r)=>s+r.active_sessions,0),network_events:counts.reduce((s,r)=>s+r.count,0),threats_detected:(await db.select({count:sql<number>`count(*)::int`}).from(events).where(sql`${events.data}->>'cleared' IS DISTINCT FROM 'true' AND ${events.data}->>'prediction' <> 'NORMAL'`))[0].count,detection_accuracy:metrics.overall_metrics.accuracy,stations_status_summary:{normal:stationRows.filter(s=>s.status==='NORMAL').length,suspicious:0,under_attack:stationRows.filter(s=>s.status==='UNDER_ATTACK').length}},attack_distribution:Object.fromEntries(model.classes.map(c=>[c,counts.find(r=>r.prediction===c)?.count||0])),recent_traffic_series:rows.slice(0,20).reverse().map(e=>({...e.data.raw_telemetry,id:e.id,predicted_attack:e.data.prediction,confidence:e.data.confidence})),recent_alerts:alerts.slice(0,6),stations:stationRows});
 }
 if(path==='/api/stations')return success(stationRows.map(s=>({...s,active_alerts_count:alerts.filter(a=>a.station_id===s.id).length,recent_alert:alerts.find(a=>a.station_id===s.id)||null})));
 if(path.startsWith('/api/stations/')) {
  const id=decodeURIComponent(path.split('/').pop()!).toUpperCase(),station=stationRows.find(s=>s.id===id);
  return station?success({station,alerts:alerts.filter(a=>a.station_id===id).slice(0,20),recent_logs:logs.filter(a=>a.station_id===id).slice(0,25)}):Response.json({detail:'Station not found'},{status:404});
 }
 if(path==='/api/logs/export-csv')return csv(logs,'ev_security_event_log');
 if(path==='/api/logs'||path==='/api/alerts') {
  const limit=Math.min(2000,Math.max(1,Number(q.get('limit'))||100));
  const data=(path==='/api/logs'?logs:alerts).filter(row=>(!q.get('severity')||row.severity===q.get('severity'))&&(!q.get('station_id')||row.station_id===q.get('station_id'))&&(!q.get('search')||JSON.stringify(row).toLowerCase().includes(q.get('search')!.toLowerCase()))).slice(0,limit);
  return Response.json({status:'success',total:data.length,data});
 }
 return Response.json({detail:'Endpoint not found'},{status:404});
 } catch(error) {
  const validation=error instanceof Error&&/Invalid |Unknown |CSV|Upload/.test(error.message);
  return Response.json({status:'error',detail:validation?(error as Error).message:'The request could not be completed. Please try again.'},{status:validation?400:503});
 }
};
export const config = { path:'/api/*' };
