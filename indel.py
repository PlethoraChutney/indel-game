from flask import Flask, render_template, request, session
import os
import spellchecker
import logging

app = Flask(__name__)
try:
    app.secret_key = os.environ['SESSION_KEY']
except KeyError:
    logging.warning('$SESSION_KEY not in environment')
    app.secret_key = 'BAD_SECRET_KEY_DEV_ONLY'

def check_real_word(word):
    checker = spellchecker.SpellChecker()
    return len(checker.unknown([word])) == 0

@app.route('/', methods = ['GET', 'POST'])
def index():
    if request.method == 'GET':
        return render_template('indel.html')