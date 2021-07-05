#python helpers/char_builder.py wav/humanum resources/charlist.js wav/humanum
#looks at a directory, creates a js of the sounds:
# is an array of sound -> {filename:filename, initial:initial, final:final, tone:tone}
#prefix is path relative to index.html

import sys
import re
import os
import itertools
import json

if len(sys.argv) != 4:
  print('usage: [input_dir] [output_fn] [prefix]')
  sys.exit(1)

#we consider m and ng to be initials, as there is some disagreement
initials = ['b','p','m','f','d','t','n','l','g','k','ng','h','gw','kw','w','z','c','s','j']
finals = ['i','u','yu','e','oe','o','aa','im','in','ing','yun','un','ung','eng','eon','oeng','on','ong','am','an','ang','aam','aan','aang','ui','ei','eoi','oi','ai','aai','iu','ou','au','aau','ip','it','ik','yut','ut','uk','ek','eot','oek','ot','ok','ap','at','ak','aap','aat','aak','m','ng']

def decompose(jp):
  sound, tone = jp[0:-1], jp[-1]
  matches = []
  for f in finals:
    if sound == f:
      matches.append({'initial':'','final':f})
    for i in initials:
      if sound == i + f:
        matches.append({'initial':i,'final':f})
  if len(matches) == 0:
    print('no match for ',jp)
  elif len(matches) > 1:
    print('multiple matches for ',jp)
  else:
    match = matches[0]
    match['tone'] = tone
    return match

input_dir = sys.argv[1]
output_fn = sys.argv[2]
prefix = sys.argv[3]

data = {}
for fn in os.listdir(input_dir):
  bn = os.path.splitext(fn)[0]
  data[bn] = decompose(bn)
  data[bn]['filename'] = os.path.join(prefix, fn)

with open(output_fn, 'w') as f:
  f.write('class Chars {\n  static data = ')#start of file
  f.write(json.dumps(data,indent=2,ensure_ascii=False).replace('\n','\n  '))
  f.write(';\n}')
