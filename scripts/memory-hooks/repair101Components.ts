import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const PACK_PATH = resolve(ROOT, 'output/memory-hooks/book-3-hooks-v3.json');

interface HookRecord {
  character: string;
  meaning: string | null;
  pinyin: string | null;
  strategy: string;
  hook: string;
  componentsUsed: Array<{ glyph: string; label: string }>;
  parts: Array<{
    glyph: string;
    glosses: string[];
    readings: string[];
    suggestedLabel: string | null;
    unknown: boolean;
    inside: string | null;
    aliases?: string[];
  }>;
  reason: string;
  validation: { valid: boolean; issues: string[] };
  attempts: number;
  acceptance: string;
  model: string;
  promptVersion: string;
}

interface HookPack {
  records: HookRecord[];
}

const REPAIRS: Record<string, { hook: string; componentsUsed: Array<{ glyph: string; label: string }> }> = {
  '七': {
    hook: 'Starting from 一(one) level bar, a sharp bend 乚(turning stroke) hooks down to count 七(seven).',
    componentsUsed: [{ glyph: '一', label: 'one' }, { glyph: '乚', label: 'turning stroke' }],
  },
  '夕': {
    hook: 'The curved 𠂊(bound hand) cradles a shining 丶(dot) of dusk light: 夕(evening) arrives.',
    componentsUsed: [{ glyph: '𠂊', label: 'bound hand' }, { glyph: '丶', label: 'dot' }],
  },
  '之': {
    hook: 'A dripping 丶(dot) glides into a sweeping stroke linking words together: 之(possessive particle "of").',
    componentsUsed: [{ glyph: '丶', label: 'dot' }],
  },
  '升': {
    hook: 'A sweeping stroke 丿(slash) swings upward as 廾(two hands) scoop grain, causing supplies to 升(rise).',
    componentsUsed: [{ glyph: '丿', label: 'slash' }, { glyph: '廾', label: 'two hands' }],
  },
  '尤': {
    hook: 'A limping 尢(lame person) marked with a prominent 丶(dot) stands out 尤(especially) noticeably.',
    componentsUsed: [{ glyph: '尢', label: 'lame person' }, { glyph: '丶', label: 'dot' }],
  },
  '引': {
    hook: 'Draw back a bent hunting 弓(bow) along the straight vertical 丨(line) of the bowstring to 引(pull).',
    componentsUsed: [{ glyph: '弓', label: 'bow' }, { glyph: '丨', label: 'line' }],
  },
  '乎': {
    hook: 'A falling stroke 丿(slash) curls beneath two raised 丷(horns), calling out in wonder: 乎(interrogative or exclamatory final particle).',
    componentsUsed: [{ glyph: '丿', label: 'slash' }, { glyph: '丷', label: 'horns' }],
  },
  '乏': {
    hook: 'A sharp stroke 丿(slash) cuts right through 之(it), leaving nothing behind: 乏(poor).',
    componentsUsed: [{ glyph: '丿', label: 'slash' }, { glyph: '之', label: 'it' }],
  },
  '充': {
    hook: 'Under a shelter 亠(lid), a 厶(private) stash is carried on sturdy 儿(legs) until containers 充(fill).',
    componentsUsed: [{ glyph: '亠', label: 'lid' }, { glyph: '厶', label: 'private' }, { glyph: '儿', label: 'legs' }],
  },
  '失': {
    hook: 'A loose stroke 丿(slash) slips off the head of the 夫(man), causing him to 失(lose) his balance.',
    componentsUsed: [{ glyph: '丿', label: 'slash' }, { glyph: '夫', label: 'man' }],
  },
  '必': {
    hook: 'A sincere 心(heart) sealed with a decisive diagonal stroke 丿(slash) marks a vow that will 必(surely) come true.',
    componentsUsed: [{ glyph: '心', label: 'heart' }, { glyph: '丿', label: 'slash' }],
  },
  '犯': {
    hook: 'A fierce 犭(dog) lunges past a kneeling 卩(seal) sentry, daring to 犯(commit) a crime.',
    componentsUsed: [{ glyph: '犭', label: 'dog' }, { glyph: '卩', label: 'seal' }],
  },
  '玉': {
    hook: 'The royal 王(king) scepter set with a gleaming 丶(dot) at its base is crafted from precious 玉(jade).',
    componentsUsed: [{ glyph: '王', label: 'king' }, { glyph: '丶', label: 'dot' }],
  },
  '由': {
    hook: 'A sprout emerges straight out of the center of a fertile 田(field), marking the origin and 由(cause).',
    componentsUsed: [{ glyph: '田', label: 'field' }],
  },
  '至': {
    hook: 'An arrow flies with 一(one) 厶(private) aim until striking the 土(soil) where you 至(reach) your goal.',
    componentsUsed: [{ glyph: '一', label: 'one' }, { glyph: '厶', label: 'private' }, { glyph: '土', label: 'soil' }],
  },
  '血': {
    hook: 'A bleeding cut drips along a diagonal stroke 丿(slash) into the shallow 皿(dish) below → 血(blood).',
    componentsUsed: [{ glyph: '丿', label: 'slash' }, { glyph: '皿', label: 'dish' }],
  },
  '似': {
    hook: 'Standing beside a familiar 亻(person), judged 以(according to) close comparison: they are strongly 似(resembling).',
    componentsUsed: [{ glyph: '亻', label: 'person' }, { glyph: '以', label: 'according to' }],
  },
  '求': {
    hook: 'With 一(one) sincere heart, hands reach into splashing 氺(water) droplets marked by a 丶(dot) to 求(beg).',
    componentsUsed: [{ glyph: '一', label: 'one' }, { glyph: '氺', label: 'water' }, { glyph: '丶', label: 'dot' }],
  },
  '系': {
    hook: 'A guiding stroke 丿(slash) organizes tangled strands of fine 糸(silk) into an orderly 系(system).',
    componentsUsed: [{ glyph: '丿', label: 'slash' }, { glyph: '糸', label: 'silk' }],
  },
  '良': {
    hook: 'A pure drop 丶(dot) touches stubborn 艮(stubborn) stone, refining it into something noble and 良(good).',
    componentsUsed: [{ glyph: '丶', label: 'dot' }, { glyph: '艮', label: 'stubborn' }],
  },
  '角': {
    hook: 'A sharp corner ⺈(knife tip) marks the boundary that you 用(use) to gauge an 角(angle).',
    componentsUsed: [{ glyph: '⺈', label: 'knife tip' }, { glyph: '用', label: 'use' }],
  },
  '協': {
    hook: 'Combining 十(ten) laborers with the united strength 劦(combined strength) of many enables teams to 協(assist).',
    componentsUsed: [{ glyph: '十', label: 'ten' }, { glyph: '劦', label: 'combined strength' }],
  },
  '卷': {
    hook: 'Tied grain stalks 龹(grain sheaf) beside a kneeling 卩(seal) scribe are rolled into a parchment 卷(book).',
    componentsUsed: [{ glyph: '龹', label: 'grain sheaf' }, { glyph: '卩', label: 'seal' }],
  },
  '叔': {
    hook: 'Gathering tender 尗(young bean) pods with a steady 又(right hand) beside your working 叔(uncle).',
    componentsUsed: [{ glyph: '尗', label: 'young bean' }, { glyph: '又', label: 'right hand' }],
  },
  '幸': {
    hook: 'Escaping buried chains in the dark 土(soil) with two hands 丷(horns) raised to dry 干(dry) off brings fortunate 幸(favor).',
    componentsUsed: [{ glyph: '土', label: 'soil' }, { glyph: '丷', label: 'horns' }, { glyph: '干', label: 'dry' }],
  },
  '承': {
    hook: 'Lifting water from the flowing 氺(water) with two steady hands, one vows to shoulder the task and 承(undertake).',
    componentsUsed: [{ glyph: '氺', label: 'water' }],
  },
  '拒': {
    hook: 'A firm outstretched 扌(hand) pushes back against a 巨(huge) impending threat: 拒(defend).',
    componentsUsed: [{ glyph: '扌', label: 'hand' }, { glyph: '巨', label: 'huge' }],
  },
  '爭': {
    hook: 'A fierce 爫(claw) grabs a broom コ(snout) past 一(one) line to pull the 亅(hook), sparking a bitter 爭(dispute).',
    componentsUsed: [{ glyph: '爫', label: 'claw' }, { glyph: 'コ', label: 'snout' }, { glyph: '一', label: 'one' }, { glyph: '亅', label: 'hook' }],
  },
  '俊': {
    hook: 'An upright, dignified 亻(person) stepping with graceful 夋(dignified walk) stands out as 俊(talented).',
    componentsUsed: [{ glyph: '亻', label: 'person' }, { glyph: '夋', label: 'dignified walk' }],
  },
  '厚': {
    hook: 'Beneath a rocky 厂(cliff), heavy timber warmed by the 日(sun) protects the resting 子(child): a 厚(thick) wall.',
    componentsUsed: [{ glyph: '厂', label: 'cliff' }, { glyph: '日', label: 'sun' }, { glyph: '子', label: 'child' }],
  },
  '帥': {
    hook: 'Stationed upon a defensive 阜(mound), the commander straightens his silk 巾(cloth) looking dashing and 帥(handsome).',
    componentsUsed: [{ glyph: '阜', label: 'mound' }, { glyph: '巾', label: 'cloth' }],
  },
  '某': {
    hook: 'Sampling the 甘(sweet) sap of a tall 木(tree) in the forest: a treat for 某(some) lucky traveler.',
    componentsUsed: [{ glyph: '甘', label: 'sweet' }, { glyph: '木', label: 'tree' }],
  },
  '郎': {
    hook: 'A noble 丶(dot) crowns the gate of the town 阝(place) where a fine 郎(gentleman) arrives.',
    componentsUsed: [{ glyph: '丶', label: 'dot' }, { glyph: '阝', label: 'place' }],
  },
  '恭': {
    hook: 'All citizens gathered in 共(all) fellowship bow with a humble, respectful 心(heart): 恭(polite).',
    componentsUsed: [{ glyph: '共', label: 'all' }, { glyph: '心', label: 'heart' }],
  },
  '朗': {
    hook: 'A sparkling 丶(dot) of starlight beside the full 月(moon) makes the clear night sky vivid and 朗(bright).',
    componentsUsed: [{ glyph: '丶', label: 'dot' }, { glyph: '月', label: 'moon' }],
  },
  '追': {
    hook: 'With urgent 辶(movement) up the grassy 阜(mound), guards race to 追(pursue) the fugitive.',
    componentsUsed: [{ glyph: '辶', label: 'movement' }, { glyph: '阜', label: 'mound' }],
  },
  '堅': {
    hook: 'A strict supervisor 臤(oversee) directs workers to tamp the damp 土(soil) until it turns rock 堅(hard).',
    componentsUsed: [{ glyph: '臤', label: 'oversee' }, { glyph: '土', label: 'soil' }],
  },
  '帳': {
    hook: 'Stretching a wide sheet of weather-resistant 巾(cloth) across 長(long) wooden poles pitches a sturdy 帳(tent).',
    componentsUsed: [{ glyph: '巾', label: 'cloth' }, { glyph: '長', label: 'long' }],
  },
  '強': {
    hook: 'Drawing a taut hunting 弓(bow) with the enduring tenacity of a resilient 虫(insect) proves a warrior is 強(strong).',
    componentsUsed: [{ glyph: '弓', label: 'bow' }, { glyph: '虫', label: 'insect' }],
  },
  '術': {
    hook: 'Taking a mindful 彳(step) while handling grains of 朮(sticky millet), then finishing with a 亍(small step) masters culinary 術(skill).',
    componentsUsed: [{ glyph: '彳', label: 'step' }, { glyph: '朮', label: 'sticky millet' }, { glyph: '亍', label: 'small step' }],
  },
  '速': {
    hook: 'With swift 辶(movement), a courier carries a tightly bound 束(bundle) without delay → 速(prompt).',
    componentsUsed: [{ glyph: '辶', label: 'movement' }, { glyph: '束', label: 'bundle' }],
  },
  '掌': {
    hook: 'Orders shouted from an authoritative 口(mouth) direct the capable 手(hand) that is in 掌(in charge).',
    componentsUsed: [{ glyph: '口', label: 'mouth' }, { glyph: '手', label: 'hand' }],
  },
  '殖': {
    hook: 'Clearing decaying 歹(decay) bones into 直(straight) fertile rows lets livestock thrive and 殖(breed).',
    componentsUsed: [{ glyph: '歹', label: 'decay' }, { glyph: '直', label: 'straight' }],
  },
  '詞': {
    hook: 'Formal 言(speech) approved and recorded by the 司(manage) officer in charge becomes an official 詞(word).',
    componentsUsed: [{ glyph: '言', label: 'speech' }, { glyph: '司', label: 'manage' }],
  },
  '象': {
    hook: 'With a curved trunk like a 𠂊(bound hand) raised over a wide mouth and heavy 豕(pig) body, the gentle 象(elephant) strolls.',
    componentsUsed: [{ glyph: '𠂊', label: 'bound hand' }, { glyph: '豕', label: 'pig' }],
  },
  '距': {
    hook: 'Using your 足(foot) to pace out a 巨(huge) open terrain measures every step of the 距(distance).',
    componentsUsed: [{ glyph: '足', label: 'foot' }, { glyph: '巨', label: 'huge' }],
  },
  '鄉': {
    hook: 'Far beyond the crowded city, a peaceful countryside 乡(village) where a wandering 郎(gentleman) finds home is 鄉(country).',
    componentsUsed: [{ glyph: '乡', label: 'village' }, { glyph: '郎', label: 'gentleman' }],
  },
  '亂': {
    hook: 'A sharp 爪(claw) pulls tangled threads until order snaps with a bent 乚(turning stroke): 亂(anarchy).',
    componentsUsed: [{ glyph: '爪', label: 'claw' }, { glyph: '乚', label: 'turning stroke' }],
  },
  '塌': {
    hook: 'A mound of loose 土(soil) bakes under the 日(sun) until crumbling like light 羽(feather) dust, causing the wall to 塌(collapse).',
    componentsUsed: [{ glyph: '土', label: 'soil' }, { glyph: '日', label: 'sun' }, { glyph: '羽', label: 'feather' }],
  },
  '塗': {
    hook: 'Mixing damp slurry from a 涂(muddy water) stream into rich clay from the dark 土(soil), workers daub and 塗(smear) sealant.',
    componentsUsed: [{ glyph: '涂', label: 'muddy water' }, { glyph: '土', label: 'soil' }],
  },
  '敬': {
    hook: 'Reading a solemn 苟(urgent) petition aloud before delivering a ceremonial 攵(rap) of the gavel shows formal 敬(respect).',
    componentsUsed: [{ glyph: '苟', label: 'urgent' }, { glyph: '攵', label: 'rap' }],
  },
  '溫': {
    hook: 'Soothing 氵(water) poured into a warm ceramic 皿(dish) warms cold hands until they feel delightfully 溫(warm).',
    componentsUsed: [{ glyph: '氵', label: 'water' }, { glyph: '皿', label: 'dish' }],
  },
  '溼': {
    hook: 'Drenching droplets of 氵(water) seep deep into the soft dark 土(soil) until everything is 溼(wet).',
    componentsUsed: [{ glyph: '氵', label: 'water' }, { glyph: '土', label: 'soil' }],
  },
  '群': {
    hook: 'An observant 君(sovereign) watches over a flock of grazing 羊(sheep) gathered into a unified 群(group).',
    componentsUsed: [{ glyph: '君', label: 'sovereign' }, { glyph: '羊', label: 'sheep' }],
  },
  '達': {
    hook: 'A long 辶(movement) across the open 土(soil) guiding a flock of 羊(sheep) brings all travelers safely home: 達(reach).',
    componentsUsed: [{ glyph: '辶', label: 'movement' }, { glyph: '土', label: 'soil' }, { glyph: '羊', label: 'sheep' }],
  },
  '嘗': {
    hook: 'Opening your 口(mouth) wide to test the flavor ensures it hits the delicious 旨(aim) → 嘗(taste).',
    componentsUsed: [{ glyph: '口', label: 'mouth' }, { glyph: '旨', label: 'aim' }],
  },
  '夢': {
    hook: 'Two 艹(leaves) crown a 罒(net) and 冖(cover) that catch 夕(evening) dusk → 夢(dream).',
    componentsUsed: [{ glyph: '艹', label: 'leaves' }, { glyph: '罒', label: 'net' }, { glyph: '冖', label: 'cover' }, { glyph: '夕', label: 'evening' }],
  },
  '摘': {
    hook: 'A gentle 扌(hand) reaches up to snap the ripe stem 啇(base) of a fruit to 摘(pick) it.',
    componentsUsed: [{ glyph: '扌', label: 'hand' }, { glyph: '啇', label: 'base' }],
  },
  '滿': {
    hook: 'Water 氵(water) pours until it fills the container level to the brim → 滿(full).',
    componentsUsed: [{ glyph: '氵', label: 'water' }],
  },
  '盡': {
    hook: 'Using a brush 聿(brush) over bright 灬(fire) to scrape every remnant from the 皿(dish) goes to the 盡(greatest extent).',
    componentsUsed: [{ glyph: '聿', label: 'brush' }, { glyph: '灬', label: 'fire' }, { glyph: '皿', label: 'dish' }],
  },
  '管': {
    hook: 'Holding a slender 竹(bamboo) staff, a dedicated 官(official) inspects the records to oversee and 管(manage).',
    componentsUsed: [{ glyph: '竹', label: 'bamboo' }, { glyph: '官', label: 'official' }],
  },
  '與': {
    hook: 'Two hands 𦥑(hands) bring 一(one) and 八(eight) together with a swift connecting stroke 丿(slash) → 與(and).',
    componentsUsed: [{ glyph: '𦥑', label: 'hands' }, { glyph: '一', label: 'one' }, { glyph: '八', label: 'eight' }, { glyph: '丿', label: 'slash' }],
  },
  '障': {
    hook: 'At the boundary of the fortified 阝(place), an official rule posted in each 章(chapter) acts to 障(separate).',
    componentsUsed: [{ glyph: '阝', label: 'place' }, { glyph: '章', label: 'chapter' }],
  },
  '齊': {
    hook: 'Under a level 亠(lid), a 刀(knife) trims each 丫(forked) branch with a stroke 丿(slash) across 二(two) posts on the upright line 丨(line) to make them 齊(even).',
    componentsUsed: [{ glyph: '亠', label: 'lid' }, { glyph: '刀', label: 'knife' }, { glyph: '丫', label: 'forked' }, { glyph: '丿', label: 'slash' }, { glyph: '二', label: 'two' }, { glyph: '丨', label: 'line' }],
  },
  '寬': {
    hook: 'Under a spacious 宀(roof), two 艹(leaves) spread wide so eyes can 見(see) each distinct corner 丶(dot): 寬(wide).',
    componentsUsed: [{ glyph: '宀', label: 'roof' }, { glyph: '艹', label: 'leaves' }, { glyph: '見', label: 'see' }, { glyph: '丶', label: 'dot' }],
  },
  '熟': {
    hook: 'When the aroma of a 孰(ripe) stew peaks over blazing embers of bright 灬(fire), every portion is thoroughly 熟(well-cooked).',
    componentsUsed: [{ glyph: '孰', label: 'ripe' }, { glyph: '灬', label: 'fire' }],
  },
  '範': {
    hook: 'A 竹(bamboo) ruler measures out standard dimensions beside a wooden 車(cart) with a 卩(seal) mark: 範(pattern).',
    componentsUsed: [{ glyph: '竹', label: 'bamboo' }, { glyph: '車', label: 'cart' }, { glyph: '卩', label: 'seal' }],
  },
  '膚': {
    hook: 'Beneath the striped fur of a mighty 虍(tiger), tough tissue protecting its 胃(stomach) forms supple 膚(skin).',
    componentsUsed: [{ glyph: '虍', label: 'tiger' }, { glyph: '胃', label: 'stomach' }],
  },
  '誼': {
    hook: 'Sharing thoughtful words of sincere 言(speech) that are proper and 宜(fitting) fosters harmony and deep bonds of lasting 誼(friendship).',
    componentsUsed: [{ glyph: '言', label: 'speech' }, { glyph: '宜', label: 'fitting' }],
  },
  '賞': {
    hook: 'A cheering 口(mouth) of onlookers celebrates the glistening 貝(shell) prize: 賞(reward).',
    componentsUsed: [{ glyph: '口', label: 'mouth' }, { glyph: '貝', label: 'shell' }],
  },
  '養': {
    hook: 'A young 羊(sheep) penned in the barn is served hearty 食(food) every sunrise to nourish and 養(raise) it.',
    componentsUsed: [{ glyph: '羊', label: 'sheep' }, { glyph: '食', label: 'food' }],
  },
  '齒': {
    hook: 'Bringing chewing to a sudden 止(stop), food presses into the 凵(container) between two rows of ivory teeth: 齒(teeth).',
    componentsUsed: [{ glyph: '止', label: 'stop' }, { glyph: '凵', label: 'container' }],
  },
  '擁': {
    hook: 'A welcoming 扌(hand) opens wide in warm 雍(harmony) to embrace cherished possessions that you proudly hold and 擁(have).',
    componentsUsed: [{ glyph: '扌', label: 'hand' }, { glyph: '雍', label: 'harmony' }],
  },
  '舉': {
    hook: 'You 與(and) your partner lift 二(two) heavy crates upright along the vertical 丨(line) to 舉(raise) them.',
    componentsUsed: [{ glyph: '與', label: 'and' }, { glyph: '二', label: 'two' }, { glyph: '丨', label: 'line' }],
  },
  '隨': {
    hook: 'Departing from the fortified 阝(place), loyal companions take the road 辶(movement) behind the guide to 隨(follow).',
    componentsUsed: [{ glyph: '阝', label: 'place' }, { glyph: '辶', label: 'movement' }],
  },
  '濕': {
    hook: 'Streams of 氵(water) soak through beams of bright 日(sun) light on twisted 糹(silk) until everything is 濕(wet).',
    componentsUsed: [{ glyph: '氵', label: 'water' }, { glyph: '日', label: 'sun' }, { glyph: '糹', label: 'silk' }],
  },
  '營': {
    hook: 'Flickering fires 火(fire) illuminate a shelter 冖(cover) over pitched 吕(tents) inside the army 營(camp).',
    componentsUsed: [{ glyph: '火', label: 'fire' }, { glyph: '冖', label: 'cover' }, { glyph: '吕', label: 'tents' }],
  },
  '縮': {
    hook: 'Delicate strands of woven 糹(silk) exposed to scorching heat inside the drying 宿(lodge) curl and 縮(withdraw).',
    componentsUsed: [{ glyph: '糹', label: 'silk' }, { glyph: '宿', label: 'lodge' }],
  },
  '聯': {
    hook: 'An 耳(ear) listens closely as twisted strands of 糹(silk) bind two partners together to 聯(ally).',
    componentsUsed: [{ glyph: '耳', label: 'ear' }, { glyph: '糹', label: 'silk' }],
  },
  '斷': {
    hook: 'Tangled strands of unbroken 糹(silk) thread get chopped clean through by a sharp 斤(axe) → 斷(sever).',
    componentsUsed: [{ glyph: '糹', label: 'silk' }, { glyph: '斤', label: 'axe' }],
  },
  '櫃': {
    hook: 'Sturdy planks of timber from a seasoned 木(tree) are crafted into a locked storage 匱(cabinet).',
    componentsUsed: [{ glyph: '木', label: 'tree' }, { glyph: '匱', label: 'cabinet' }],
  },
  '蹟': {
    hook: 'A muddy 足(foot) leaves an imprint while running to carry out an urgent 責(duty) → 蹟(trace).',
    componentsUsed: [{ glyph: '足', label: 'foot' }, { glyph: '責', label: 'duty' }],
  },
  '穩': {
    hook: 'A towering stack of golden 禾(grain) balanced with thoughtful 心(heart) stays completely 穩(steady).',
    componentsUsed: [{ glyph: '禾', label: 'grain' }, { glyph: '心', label: 'heart' }],
  },
  '藝': {
    hook: 'Cultivating delicate 艹(grass) flowers with imagination as expansive as a drifting 云(cloud) is fine 藝(art).',
    componentsUsed: [{ glyph: '艹', label: 'grass' }, { glyph: '云', label: 'cloud' }],
  },
  '騙': {
    hook: 'A cunning merchant offers a weary old 馬(horse) while pointing to a fake wooden 扁(flat tablet) pedigree to swindle and 騙(cheat).',
    componentsUsed: [{ glyph: '馬', label: 'horse' }, { glyph: '扁', label: 'flat tablet' }],
  },
  '嚴': {
    hook: 'Shouts from shouting mouths echo off the steep 厂(cliff) as the commander gives 嚴(strict) orders.',
    componentsUsed: [{ glyph: '厂', label: 'cliff' }],
  },
  '寶': {
    hook: 'Stored safely under the 宀(roof) alongside the royal 王(king) treasury, a precious 貝(shell) coin marks 寶(treasure).',
    componentsUsed: [{ glyph: '宀', label: 'roof' }, { glyph: '王', label: 'king' }, { glyph: '貝', label: 'shell' }],
  },
  '獻': {
    hook: 'Presenting a feast pot striped like a 虍(tiger) alongside a faithful 犬(dog) to 獻(offer) to the court.',
    componentsUsed: [{ glyph: '虍', label: 'tiger' }, { glyph: '犬', label: 'dog' }],
  },
  '蠟': {
    hook: 'Wax gathered by an 虫(insect) molded around a candle wick melts into an ambient 蠟(candle).',
    componentsUsed: [{ glyph: '虫', label: 'insect' }],
  },
  '戀': {
    hook: 'Intricate threads of 糹(silk) affection wind tightly around the tender 心(heart) → 戀(love).',
    componentsUsed: [{ glyph: '糹', label: 'silk' }, { glyph: '心', label: 'heart' }],
  },
  '變': {
    hook: 'Tangled threads of 糹(silk) chaos get struck by a sharp 攵(rap), forcing them to change and 變(transform).',
    componentsUsed: [{ glyph: '糹', label: 'silk' }, { glyph: '攵', label: 'rap' }],
  },
  '周': {
    hook: 'Circling the kingdom outer 冂(frame) while cultivating auspicious 吉(lucky) fortune marks the historic reign of the 周(Zhou dynasty).',
    componentsUsed: [{ glyph: '冂', label: 'frame' }, { glyph: '吉', label: 'lucky' }],
  },
};

function main(): void {
  const pack = JSON.parse(readFileSync(PACK_PATH, 'utf8')) as HookPack;
  let updatedCount = 0;

  for (const record of pack.records) {
    const repair = REPAIRS[record.character];
    if (repair) {
      record.hook = repair.hook;
      record.componentsUsed = repair.componentsUsed;
      updatedCount++;
    }
  }

  console.log(`Updated ${updatedCount} characters in ${PACK_PATH}`);
  writeFileSync(PACK_PATH, `${JSON.stringify(pack, null, 2)}\n`, 'utf8');
}

main();
