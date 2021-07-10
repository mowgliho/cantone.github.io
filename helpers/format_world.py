import sys
import os
import subprocess

if len(sys.argv) != 3:
  print('usage [input_dir] [output_dir]')
  sys.exit(1)

in_dir = sys.argv[1]
out_dir = sys.argv[2]

for x in os.listdir(sys.argv[1]):
  print(x)
  subprocess.run(['sox', os.path.join(in_dir, x), '-r', '44.1k', '-b', '16', os.path.join(out_dir, x)])
