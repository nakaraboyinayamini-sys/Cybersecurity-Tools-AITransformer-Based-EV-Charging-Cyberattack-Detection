import { test } from 'node:test';
import assert from 'node:assert/strict';
import fixtures from './inference-fixtures.json' with { type: 'json' };
import { predict,generate,validate,model } from '../server/inference.mjs';
for(const [i,f] of fixtures.entries())test(`Python parity ${i}: ${f.prediction}`,()=>{
 const result=predict(f.raw);
 assert.equal(result.prediction,f.prediction);
 assert.ok(Math.abs(result.confidence-f.confidence)<.03);
 for(const key of model.features)assert.ok(Math.abs(result.attention_weights[key]-f.attention_weights[key])<.03, key);
});
test('all attack simulations classify using telemetry',()=>{
 for(const attack of model.classes){const r=generate(attack,'EV-CS-01');r.attack_label='misleading label';assert.equal(predict(r).prediction,attack);}
});
test('reject invalid telemetry before persistence',()=>{
 for(const invalid of [{voltage:'bad'},{charging_station_id:'unknown'},{current:-5},{authentication_status:3},{data_integrity_score:2}])assert.throws(()=>validate(invalid));
});
