from flask import Flask, render_template, request
import os
import spellchecker
import logging
import numpy as np
import json
import random
from datetime import datetime

with open('words.json', 'r') as f:
    word_list = json.load(f)

def generate_word_pair():
    words_and_time = [
        random.choice(word_list),
        random.choice(word_list),
        datetime.now().day
    ]

    if words_and_time[0] == words_and_time[1]:
        words_and_time = generate_word_pair()

    return words_and_time

words_and_time = generate_word_pair()

checker = spellchecker.SpellChecker()

def levenshtein_distance(token1, token2):
    # https://blog.paperspace.com/measuring-text-similarity-using-levenshtein-distance/
    # if this is slow it could definitely be vectorized
    #
    # it's quite fast

    token1 = token1.replace(' ', '')
    token2 = token2.replace(' ', '')
    
    distances = np.zeros((len(token1) + 1, len(token2) + 1))
    distances[:,0] = np.arange(len(token1) + 1)
    distances[0] = np.arange(len(token2) + 1)

    for ind_one in range(len(token1)):
        for ind_two in range(len(token2)):
            # remember we're currently working on index + 1
            # because row/col 0 is initialized with the range
            if token1[ind_one] == token2[ind_two]:
                distances[ind_one + 1, ind_two + 1] = distances[ind_one, ind_two]
            else:
                distances[ind_one + 1, ind_two + 1] = np.min([
                    distances[ind_one, ind_two],
                    distances[ind_one + 1, ind_two],
                    distances[ind_one, ind_two + 1]
                ]) + 1

    # distance between tokens is bottom-right entry in matrix
    return distances[len(token1), len(token2)]


app = Flask(__name__)
try:
    app.secret_key = os.environ['SESSION_KEY']
except KeyError:
    logging.warning('$SESSION_KEY not in environment')
    app.secret_key = 'BAD_SECRET_KEY_DEV_ONLY'

def check_word(word, prev_word):
    words = [x.strip() for x in word.split(' ') if x]
    spellcheck_answers = [len(checker.unknown([x])) == 0 for x in words]
    word_list_answers = [x in word_list for x in words]
    complete_answers = [spellcheck_answers[i] or word_list_answers[i] for i in range(len(words))]
    return {
        'word': all(complete_answers),
        'distance': bool(levenshtein_distance(word, prev_word) <= 1)
    }


@app.route('/', methods = ['GET', 'POST'])
def index():
    if request.method == 'GET':
        if datetime.now().day != words_and_time[2]:
            words_and_time[0:2] = generate_word_pair()

        return render_template('indel.html', night_theme = request.args.get('theme') == 'dark')

    elif request.method == 'POST':
        req_json = request.get_json()

        # check distance
        if req_json['action'] == 'check_word':
            return json.dumps(
                check_word(req_json['word'], req_json['prev_word'])
            ), 200, {'ContentType': 'application/json'}
        elif req_json['action'] == 'setup':
            return json.dumps(
                {'start_word': words_and_time[0], 'target_word': words_and_time[1]}
            ), 200, {'ContentType': 'application/json'}