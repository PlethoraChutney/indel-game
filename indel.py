from flask import Flask, render_template, request
import os
import spellchecker
import logging
import numpy as np
import json
import random
import Levenshtein

from datetime import datetime

with open('words.json', 'r') as f:
    word_list = json.load(f)


def generate_word_pair():
    while True:
        try:
            starting_word = random.choice(word_list)
            prev_words = [starting_word]
            for _ in range(random.randrange(15, 21)):
                print('Iterating...')
                word_len = len(prev_words[-1])
                working_list = [x for x in word_list if any([len(x) == word_len-1, len(x) == word_len, len(x) == word_len + 1])]
                good_list = [x for x in working_list if Levenshtein.distance(x, prev_words[-1]) == 1 and x not in prev_words]
                print(good_list)
                prev_words.append(
                    random.choice(good_list)
                )
            break
        except IndexError:
            continue

    words_and_time = [
        starting_word,
        prev_words[-1],
        datetime.now().day
    ]

    return words_and_time, prev_words

words_and_time, word_path = generate_word_pair()

checker = spellchecker.SpellChecker()


app = Flask(__name__)
try:
    app.secret_key = os.environ['SESSION_KEY']
except KeyError:
    logging.warning('$SESSION_KEY not in environment')
    app.secret_key = 'BAD_SECRET_KEY_DEV_ONLY'

def check_word(word, prev_word):
    spellcheck_answers = len(checker.unknown([word])) == 0
    word_list_answers = word in word_list
    return {
        'word': spellcheck_answers or word_list_answers,
        'distance': bool(Levenshtein.distance(word, prev_word) <= 1)
    }


@app.route('/', methods = ['GET', 'POST'])
def index():
    if request.method == 'GET':
        if datetime.now().day != words_and_time[2]:
            words_and_time[0:2], path = generate_word_pair()

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