"""Traditional -> simplified, char by char, from the repo's CEDICT dictionary.
Usage: python3 t2s.py "這個週末我不知道要做什麼。"   (prints simplified; warns on ambiguous chars)
Import: from t2s import t2s"""
import json,glob,sys,os,collections
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'../../../..'))
_m=collections.defaultdict(collections.Counter)
for f in glob.glob(ROOT+'/public/data/dictionary/shard-*.json'):
  for it in json.load(open(f))['items']:
    s,t=it[1],it[2] or it[1]
    if len(s)==len(t):
      for a,b in zip(t,s): _m[a][b]+=1
AMBIG={'著','乾','藉','瞭','覆','餘','麼','幹','徵','於','甚','畫'}
FIX={'是':'是','的':'的','得':'得','著':'着','麼':'么','乾':'干','於':'于','餘':'余','裡':'里','台':'台','妳':'妳'}
def t2s(text):
  out=[]
  for c in text:
    if c in FIX: out.append(FIX[c]); continue
    cand=_m.get(c)
    out.append(cand.most_common(1)[0][0] if cand else c)
  return ''.join(out)
if __name__=='__main__':
  s=sys.argv[1]; print(t2s(s))
  amb=[c for c in s if c in AMBIG]
  if amb: print('CHECK (more than one simplified form):',' '.join(sorted(set(amb))),file=sys.stderr)
