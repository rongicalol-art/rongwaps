import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const CHAR_CATALOG = resolve(ROOT, 'output/memory-hooks/book-1-hooks-v3.json');

const REPAIRS: Record<string, string> = {
  '弟': 'A pair of 丷(horns) rests above a 弔(coil) frame → the younger 弟(young brother).',
  '第': 'A 竹(bamboo) tally notched upon a 弔(coil) marker denotes 第(ordinal) rank.',
  '腦': 'A vital ⺼(meat) organ crowned by 巛(hair) atop the 囟(skull) is the 腦(brain).',
  '而': 'A level 一(one) stroke above flowing 𦉫(beard) strands connects thoughts → 而(and).',
  '校': 'Tall 木(tree) shade where eager students 交(intersect) paths on campus → 校(school).',
  '較': 'Two 車(cart) carriages speed side by side where paths 交(intersect) to 較(compare) velocity.',
  '餃': 'Tender 飠(food) pastry with folded edges that 交(intersect) neatly forms a 餃(dumpling).',
  '麼': 'Fibers of 麻(hemp) spun into a tiny 幺(small) thread add a softening 麼(particle) tone.',
  '做': 'A diligent 亻(person) acting with a clear 故(reason) steps up to 做(make) it happen.',
  '朵': 'A slender 几(table) carved from 朩(tree) wood holds a fresh 朵(flower).',
  '淇': 'Clear flowing 氵(water) alongside that 其(other) bank gives cool ice cream refreshment in the 淇(river).',
  '吧': 'A speaking 口(mouth) expressing strong 巴(desire) adds a polite 吧(particle) to urge consent.',
  '棟': 'Stout 木(tree) timbers aligned toward the 東(east) support the roof 棟(beam).',
  '隻': 'A hunter clutching a captured 隹(bird) reaches 又(again) for another 隻(only) quarry.',
  '作': 'A skilled 亻(person) making the 乍(first) strike begins to 作(make) their craft.',
  '份': 'A diligent 亻(person) who took their 分(divide) of duties now fulfills their 份(part).',
  '友': 'A steady 𠂇(left hand) extends and 又(again) a hand grasps back, uniting in loyal 友(friend)ship.',
};

function run() {
  const charData = JSON.parse(readFileSync(CHAR_CATALOG, 'utf8'));
  let updated = 0;
  for (const record of charData.records) {
    if (REPAIRS[record.character]) {
      record.hook = REPAIRS[record.character];
      record.acceptance = 'clean';
      updated++;
    }
  }
  writeFileSync(CHAR_CATALOG, JSON.stringify(charData, null, 2) + '\n');
  console.log(`Updated ${updated} characters in ${CHAR_CATALOG}`);
}

run();
