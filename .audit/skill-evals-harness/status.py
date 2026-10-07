import json
from pathlib import Path
done={}
for l in open('/tmp/skillrun/briefs.jsonl'):
    b=json.loads(l); ok=(Path(b['outputs'])/'response.md').exists()
    done.setdefault(b['skill'],[]).append(ok)
graded={s for s in done if list(Path(f'/tmp/skillrun/ws/{s}/blind').glob('*/*.grading.json'))}
print('ready to grade:',' '.join(s for s,v in done.items() if all(v) and s not in graded and not Path(f'/tmp/skillrun/ws/{s}/blind').exists()))
print('partial:',' '.join(f"{s}({sum(v)}/{len(v)})" for s,v in done.items() if not all(v)))
