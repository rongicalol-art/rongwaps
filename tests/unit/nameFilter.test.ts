import assert from 'node:assert/strict';
import test from 'node:test';
import { isNameAllowed } from '../../shared/nameFilter';

test('ordinary names pass, including ones that contain a listed word inside them', () => {
  for (const name of ['Mei Lin', 'Ron', '小明', 'Dickson', 'Sexton', 'Scunthorpe', 'Hancock', 'Cassidy', '幹嘛', 'Grape', 'Cumberbatch', '王小美', 'Jun 俊']) {
    assert.equal(isNameAllowed(name), true, name);
  }
});

test('rude names are refused, including spaced, cased and swapped spellings', () => {
  for (const name of ['fuck', 'F.U.C.K', 'f u c k you', 'Sh1t', 'big dick', 'B1tch', 'nazi', '幹你娘', '他妈的', '傻逼', 'ｆｕｃｋ']) {
    assert.equal(isNameAllowed(name), false, name);
  }
});
