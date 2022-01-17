from flask import Flask, render_template, request, session
import os
import spellchecker
import logging
import numpy as np
import json

def levenshtein_distance(token1, token2):
    # https://blog.paperspace.com/measuring-text-similarity-using-levenshtein-distance/
    # if this is slow it could definitely be vectorized
    #
    # it's quite fast
    
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

target_word = 'cooks'

def check_word(word, prev_word):
    checker = spellchecker.SpellChecker()
    return len(checker.unknown([word])) == 0 and levenshtein_distance(word, prev_word) <= 1

@app.route('/', methods = ['GET', 'POST'])
def index():
    if request.method == 'GET':
        return render_template('indel.html')

    elif request.method == 'POST':
        req_json = request.get_json()

        # check distance
        if req_json['action'] == 'check_word':
            return json.dumps(
                str(check_word(req_json['word'], req_json['prev_word']))
            ), 200, {'ContentType': 'application/json'}
        elif req_json['action'] == 'setup':
            return json.dumps(
                {'start_word': target_word}
            ), 200, {'ContentType': 'application/json'}