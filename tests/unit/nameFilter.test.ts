import assert from 'node:assert/strict';
import test from 'node:test';
import { CHAT_MASK, NAME_RESERVED, isNameAllowed, maskChat, nameProblem } from '../../shared/nameFilter';

test('ordinary names pass, including ones that contain a listed word inside them', () => {
  for (const name of ['Mei Lin', '小明', 'Dickson', 'Sexton', 'Scunthorpe', 'Hancock', 'Cassidy', '幹嘛', 'Grape', 'Cumberbatch',
    '王小美', 'Jun 俊', 'Ronald', 'Ronnie', 'José', 'Zoë', 'Анна', 'J. K.', 'Titus', 'Analise', 'Ana 3', 'Modesto']) {
    assert.equal(isNameAllowed(name), true, name);
  }
});

test('rude names are refused, including spaced, cased, accented, look-alike and swapped spellings', () => {
  for (const name of ['fuck', 'F.U.C.K', 'f u c k you', 'Sh1t', 'big dick', 'B1tch', 'nazi', '幹你娘', '他妈的', '傻逼', 'ｆｕｃｋ',
    'fuсk', 's.h.i.t', '幹 你', 'fúck', 'sh!t', 'f​uck', 'ѕhit', 'сunt', '$hit', 'onlyfans girl', 'big tits']) {
    assert.equal(isNameAllowed(name), false, name);
  }
});

test('names that pose as the app, hide their direction, or carry contact details are refused', () => {
  for (const name of ['Ron', 'Admin Ron', 'ron official', 'R o n', 'RonsMandarin', '官方', '王老師', '客服小美',
    'Ron‮evil', 'add me line.me', 'see www.x', 'mail me@x', '0912 345 678', 'insta.gg/me']) {
    assert.equal(isNameAllowed(name), false, name);
  }
  assert.equal(isNameAllowed('Ron', { owner: true }), true, 'the owner keeps their own name');
  assert.equal(isNameAllowed('Ron fuck', { owner: true }), false);
  assert.equal(nameProblem('Admin'), NAME_RESERVED);
});

test('chat masks listed words and leaves the rest of the line alone', () => {
  assert.equal(maskChat('you are a fuсking idiot'), `you are a ${CHAT_MASK} idiot`);
  assert.equal(maskChat('shit happens'), `${CHAT_MASK} happens`);
  assert.equal(maskChat('幹 你 娘 啦'), `${CHAT_MASK} 娘 啦`);
  assert.equal(maskChat('他媽的'), `${CHAT_MASK}的`);
  for (const line of ['我們幹嘛去圖書館？', 'Dickson and Cassidy study grammar', 'Scunthorpe is in England', '老師好！', 'Ron is great']) {
    assert.equal(maskChat(line), line, line);
  }
});
