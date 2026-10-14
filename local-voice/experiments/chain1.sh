cd /Users/hark/Movies/done-video-research/qwen-test
.venv/bin/python run_exp.py e0_base --seeds 1,2 > exp/e0.log 2>&1
.venv/bin/python run_exp.py e1_ref --seeds 1,2 --params '{"ref_audio":"/Users/hark/Movies/done-video-research/qwen-test/ref2/ref_energetic.wav","ref_text":"To create a new page, I have to create a new file like this and then I have to write front matter. So this is the process of creating a new page."}' > exp/e1.log 2>&1
