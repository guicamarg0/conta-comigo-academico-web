import test from 'node:test';
import assert from 'node:assert/strict';
import { ocupaDia, cruzaPeriodo, periodoServico } from './periodoServico.js';
import { conviteServico } from './calendario.js';
test('serviço ocupa período inclusivo entre meses e convite termina no dia seguinte',()=>{
 const s={id:'teste',dataInicio:'2026-09-29',dataFim:'2026-10-02'};
 for(const dia of ['2026-09-29','2026-09-30','2026-10-01','2026-10-02']) assert.equal(ocupaDia(s,dia),true);
 assert.equal(ocupaDia(s,'2026-10-03'),false);
 assert.equal(cruzaPeriodo(s,'2026-10-01','2026-11-01'),true);
 assert.equal(cruzaPeriodo(s,'2026-10-03','2026-11-01'),false);
 assert.match(conviteServico(s),/DTSTART;VALUE=DATE:20260929/);
 assert.match(conviteServico(s),/DTEND;VALUE=DATE:20261003/);
 assert.deepEqual(periodoServico({dataProgramada:'2026-09-29'}),{inicio:'2026-09-29',fim:'2026-09-29'});
 assert.throws(()=>conviteServico({...s,dataFim:'2026-09-28'}));
});
