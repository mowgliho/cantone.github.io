#reads a directory/directories for audio files, creates an appropriate js file with information about relevant audio files:
# assumes that the input folder has folders. Each folder is a data source. In that folder should be a js_files.tsv, saying where things should go. There should also be a 'clean', which points to the files
# js file will look like:
#   class Phrases {
#     static data = {
#       你好: {
#         num_pron: 1, num_char = 2, files: {forvo:[], spice: []}
#       }
#     };
#   }

import os
import sys
import re
import csv
import json
import shutil
import pathlib

if len(sys.argv) != 5:
  print('usage: [input_dir] [output_fn] [phrase_dir] [prefix]')
  sys.exit()

WAV_FOLDER = 'clean'
INDEX_FN = 'js_files.tsv'

input_dir = sys.argv[1]
output_fn = sys.argv[2]
phrase_dir = sys.argv[4] # directory of the wav files
prefix = sys.argv[3] # directory of the wav files relative to whereever the script calling the script is to be found (e.g. wav/phrases

pathlib.Path(phrase_dir).mkdir(parents=True,exist_ok=True)
data = {}
for fol in os.listdir(input_dir):
  folder = os.path.join(input_dir, fol)
  if not os.path.isdir(folder):
    continue
  print(folder)
  wav_folder = os.path.join(folder, WAV_FOLDER)
  index_fn = os.path.join(folder, INDEX_FN)
  if not os.path.exists(wav_folder) or not os.path.isdir(wav_folder):
    print('\t no wav folder', wav_folder)
    continue
  if not os.path.exists(index_fn):
    print('\t no index file', index_fn)
    continue
  with open(index_fn, 'r') as f:
    rows = [r for r in csv.DictReader(f, dialect = csv.excel_tab)]
  for row in rows:
    word = row['text']
    if word not in data:
      data[word] = {'num_pron': 0, 'num_char': len(word), 'files': {}}
    data[word]['num_pron'] += 1
    if fol not in data[word]['files']:
      data[word]['files'][fol] = []
    new_fn = fol + '_' + row['filename']
    data[word]['files'][fol].append(os.path.join(phrase_dir,new_fn))
    shutil.copyfile(os.path.join(wav_folder, row['filename']), os.path.join(phrase_dir,new_fn))

with open(output_fn, 'w', encoding='utf8') as f:
  f.write('class Phrases {\n  static data = ')#start of file
  f.write(json.dumps(data,indent=2,ensure_ascii=False).replace('\n','\n  '))
  f.write(';\n}')
