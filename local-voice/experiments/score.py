import json,re,sys,pathlib
import gates
sys.argv=[sys.argv[0]]
from driver_funcs import wer
H=pathlib.Path('.')
lines=json.load(open('lines.json'))
vc={}
for l in open('work/vc.txt'):
    p=l.split()
    if len(p)>=7: vc[p[0]]=dict(match=float(p[1]),indian=float(p[2]),us=float(p[3]),f0=float(p[5]))
rows=[]
for L in lines:
    n=L['n']; row={'n':n,'say':L['say']}
    for who,d in [('elevenlabs','el'),('qwen','qwen')]:
        f=f'{d}/{n}-{who}.wav'; m=gates.measure(f); heard=pathlib.Path(f'work/wh_final/{n}-{who}.txt').read_text().replace('\n',' ').strip()
        m.update(vc[f'{n}-{who}.wav']); m['wer']=wer(L['say'],heard); m['heard']=heard
        m['pass']=dict(us=m['us']<=0.2,match=m['match']>=0.65,wer=m['wer']<0.2,tail=m['tail']<=-32,rise=m['rise']<=12)
        row[who]=m
    rows.append(row)
json.dump(rows,open('final.json','w'),indent=1,default=float)
def c(m,k,fmt): 
    v=m[k]; return fmt.format(v)+('' if m['pass'][k] else '*')
print('n | match EL | match Q | US EL/Q | WER EL/Q | tail dB EL/Q | rise Hz EL/Q | f0 EL/Q')
for r in rows:
    e,q=r['elevenlabs'],r['qwen']
    print(r['n'],'|',c(e,'match','{:.2f}'),'|',c(q,'match','{:.2f}'),'|',c(e,'us','{:.2f}'),c(q,'us','{:.2f}'),'|',c(e,'wer','{:.2f}'),c(q,'wer','{:.2f}'),'|',c(e,'tail','{:.1f}'),c(q,'tail','{:.1f}'),'|',c(e,'rise','{:+.0f}'),c(q,'rise','{:+.0f}'),'|',round(e['f0']),round(q['f0']))
    print('   EL heard:',e['heard']); print('   Q  heard:',q['heard'])
