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
    i = 0
    iter_range = [10, 16]
    while True:
        try:
            starting_word = random.choice(word_list)
            prev_words = [starting_word]

            for _ in range(random.randrange(*iter_range)):
                word_len = len(prev_words[-1])
                working_list = [x for x in word_list if any([len(x) == word_len-1, len(x) == word_len, len(x) == word_len + 1])]
                good_list = [(x, sum([Levenshtein.distance(x, y) for y in prev_words])) for x in working_list if Levenshtein.distance(x, prev_words[-1]) == 1 and x not in prev_words]
                
                # keep only the words with the most cumulative distance from all previous words
                # to try to maximize our travel in word space
                most_cumulative_distance = max([x[1] for x in good_list])
                good_list = [x for x in good_list if x[1] == most_cumulative_distance]
                pick = random.choice(good_list)
                prev_words.append(pick[0])
                if pick[1] > 50:
                    break
                

            break
        except ValueError:
            i += 1
            if i == 10:
                iter_range = [5, 11]
            continue

    print(prev_words)

    word_path_info = [
        starting_word,
        prev_words[-1],
        datetime.now().day,
        len(prev_words) - 1,
        'INDEL',
        0
    ]

    return word_path_info

word_path_info = generate_word_pair()

checker = spellchecker.SpellChecker()


app = Flask(__name__)
try:
    app.secret_key = os.environ['SESSION_KEY']
except KeyError:
    logging.warning('$SESSION_KEY not in environment')
    app.secret_key = 'BAD_SECRET_KEY_DEV_ONLY'

def check_word(word, prev_word):
    spellcheck_answers = len(checker.unknown([word])) == 0
    word_list_answers = word.lower() in word_list
    return {
        'word': spellcheck_answers or word_list_answers,
        'distance': bool(Levenshtein.distance(word, prev_word) <= 1)
    }


print(word_path_info)

@app.route('/', methods = ['GET', 'POST'])
def index():
    if request.method == 'GET':
        if datetime.now().day != word_path_info[2]:
            word_path_info[0:5] = generate_word_pair()
            print(word_path_info)

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
                {
                    'start_word': word_path_info[0],
                    'target_word': word_path_info[1],
                    'current_best': word_path_info[3],
                    'current_best_player': word_path_info[4],
                    'other_players': word_path_info[5]
                }
            ), 200, {'ContentType': 'application/json'}
        elif req_json['action'] == 'validate_new_winner':
            try:
                num_words = len(req_json['path'])
                assert req_json['path'][0].lower() == word_path_info[0]
                assert req_json['path'][-1].lower() == word_path_info[1]
                for i in range(1, num_words):
                    last_word = req_json['path'][i - 1]
                    word = req_json['path'][i]
                    dist = Levenshtein.distance(last_word, word)
                    assert dist <= 1

                if num_words - 1 == word_path_info[3]:
                    word_path_info[5] = word_path_info[5] + 1
                elif num_words - 1 < word_path_info[3]:
                    word_path_info[3] = len(req_json['path']) - 1
                    word_path_info[4] = req_json['player']
                    word_path_info[5] = 0
                return json.dumps({'player': 'good'}), 200, {'ContentType': 'application/json'}
            except AssertionError:
                return json.dumps({'player': 'cheater'}), 200, {'ContentType': 'application/json'}

