#!/usr/bin/python
import cgi, os
import os
import cgitb
cgitb.enable()

form = cgi.FieldStorage()
f = form['audio_data']

if f.filename:
  fn = os.path.basename(f.filename)
  open(os.path.join('wav',fn),'wb').write(f.file.read())

print("Content-type: text/plain\n")
