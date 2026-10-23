import test from 'node:test';
import assert from 'node:assert/strict';
import {stockError,fulfilmentError,safeItems} from '../app/admin-domain.ts';
test('rejects stale stock counts instead of overwriting another adjustment',()=>{
  assert.equal(stockError(10,5,10,'Print batch received'),null);
  assert.match(stockError(15,5,10,'Another batch'),/Stock changed/);
});
test('stock cannot become negative or use fractional quantities',()=>{
  assert.match(stockError(2,-3,2,'Damaged parts'),/below zero/);
  assert.match(stockError(2,0.5,2,'Count correction'),/whole quantity/);
  assert.match(stockError(2,1,2,''),/reason/);
});
test('unpaid orders cannot enter packing',()=>assert.match(fulfilmentError('new','packing','not_started',''),/Confirm payment/));
test('sent orders require tracking and cannot skip workflow stages',()=>{
  assert.match(fulfilmentError('packing','sent','demo_simulated',''),/tracking/);
  assert.match(fulfilmentError('new','delivered','demo_simulated','DEMO-1'),/transition/);
  assert.equal(fulfilmentError('packing','sent','test_succeeded','TEST-1'),null);
});
test('terminal orders cannot be reopened by a status edit',()=>{
  assert.match(fulfilmentError('cancelled','new','not_started',''),/transition/);
  assert.match(fulfilmentError('delivered','packing','test_succeeded','TEST-1'),/transition/);
});
test('corrupt line item data does not crash order detail',()=>assert.deepEqual(safeItems('invalid'),[]));
