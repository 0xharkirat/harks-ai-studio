cd /Users/hark/Movies/done-video-research/qwen-test
.venv/bin/python run_exp.py e7_final --mode sentences --gap 450 --attempts 4 --level -19 --seeds 1 > exp/e7.log 2>&1
.venv/bin/python run_exp.py e7_long_one --texts texts_long.json --mode single --attempts 4 --level -19 --seeds 1 > exp/e7l.log 2>&1
.venv/bin/python run_exp.py e7_long_split --texts texts_long.json --mode sentences --gap 450 --attempts 4 --level -19 --seeds 1 > exp/e7s.log 2>&1
