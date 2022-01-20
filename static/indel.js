const indel_url = '/';
let keyboardLock = false;

// create keyboard

const keyboardDiv = document.getElementById('keyboard');
for (const row of ['QWERTYUIOP', 'ASDFGHJKL', '<ZXCVBNM>']) {
    const newRow = document.createElement('div')
    for (let char of row) {
        if (char === '<') {
            char = 'Enter';
        } else if (char === '>') {
            char = 'Del';
        }
        const newKey = document.createElement('div');
        newKey.setAttribute('id', 'key-' + char);
        newKey.classList.add('keyboard-key');

        const letterNode = document.createTextNode(char);
        newKey.appendChild(letterNode);
        newRow.appendChild(newKey);
    }
    keyboardDiv.appendChild(newRow);
};

$('.keyboard-key').click(function() {
    var keyPressed = $(this).text();
    read_key(keyPressed);
});

async function check_word(word, prev_word) {
    if (word.includes(' ')) {
        
        $('#current-word')
            .addClass('bad-guess');
        window.setTimeout(() => {
            $('#current-word')
                .removeClass('bad-guess');
        }, 500);
        errorModal('Spaces no longer allowed.');
        return false;

    }

    const response = await fetch(indel_url, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json'
        },
        redirect: 'follow',
        referrerPolicy: 'no-referrer',
        body: JSON.stringify({
            "action": "check_word",
            "word": word,
            "prev_word": prev_word
        })
    });

    response.json().then((value) => {
        if (value.word && value.distance) {
            vm.previousWords.push(word);
            $('#previous-guesses').animate(
                {scrollTop: $('#previous-guesses')[0].scrollHeight}, 'slow'
            );
            vm.currentWord = [];
            window.setTimeout(() => {
                if (word === vm.targetWord) {
                    puzzleComplete();
                }
            }, 250);
        } else {
            $('#current-word')
                .addClass('bad-guess');
            window.setTimeout(() => {
                $('#current-word')
                    .removeClass('bad-guess');
            }, 500);

            wordError(value);
        }
    });
}

function wordError(answerObject){
    messageText = []
    if (!answerObject.word) {
        messageText.push('Not a word');
    }

    if (!answerObject.word && !answerObject.distance) {
        messageText.push(' and t');
    } else if (answerObject.word) {
        messageText.push('T');
    } else {
        messageText.push('.');
    }

    if (!answerObject.distance) {
        messageText.push('oo many changes.');
    }

    errorModal(messageText.join(''));
}

function errorModal(messageText, timeout = 1000) {
    $('#error-modal-content')
        .text(messageText)
        .addClass('visible');

    window.setTimeout(() => {
        $('#error-modal-content')
            .removeClass('visible');
    }, timeout);
    
    $('#error-modal').removeClass('hidden');

    window.setTimeout(() => {
        $('#error-modal').addClass('hidden');
    }, timeout);
}

function makeEmojiChain(wordList) {
    let emojiList = ['0️⃣','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
    let emojiStrings = [];
    
    for (let i = 0; i < wordList.length; i++) {
        let words = wordList[i].split(' ');
        let wordEmoji = [];
        for (word of words) {
            if (word.length > 10) {
                wordEmoji.push(word.length);
            } else {
                wordEmoji.push(emojiList[word.length]);
            }
        }
        emojiStrings.push(wordEmoji.join(' '));
    }

    return emojiStrings.join(' → ');
}

function puzzleComplete() {
    keyboardLock = true;
    $('h1, hr, #keyboard, #previous-guesses')
        .not('#target-word, #game-title, #num-guesses')
        .fadeOut(2500);

    window.setTimeout(() => {
        $('#previous-guesses').addClass('hidden');
        $('#target-word').addClass('winner');
        $('#num-guesses').removeClass('hidden');
    }, 2500);

    window.setTimeout(() => {
        let emojiInterior = makeEmojiChain(vm.previousWords.slice(1, vm.previousWords.length-1));

        $('#emoji-chain')
            .text(vm.previousWords[0] + ' → ' + emojiInterior + ' → ' + vm.previousWords[vm.previousWords.length -1])
            .removeClass('hidden');
    }, 2500)

    window.setTimeout(newWinner, 2500);
}

async function newWinner() {
    if (vm.previousWords.length - 1 < vm.solvedIn) {
        playerName = window.prompt('You beat the previous best! What\'s your name?');
        const response = await fetch(indel_url, {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json'
            },
            redirect: 'follow',
            referrerPolicy: 'no-referrer',
            body: JSON.stringify({
                "action": "validate_new_winner",
                "path": vm.previousWords,
                "player": playerName
            })
        });
    
        response.json().then((value) => {
            if (value.player == 'good') {
                vm.solvedBy = playerName;
                vm.solvedIn = vm.previousWords.length - 1;
                vm.otherPlayers = 0;
            } else {
                window.alert('Ah...but you cheated...');
            }
        });
    } else if (vm.previousWords.length - 1 === vm.solvedIn) {
        const response = await fetch(indel_url, {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json'
            },
            redirect: 'follow',
            referrerPolicy: 'no-referrer',
            body: JSON.stringify({
                "action": "validate_new_winner",
                "path": vm.previousWords
            })
        });
    
        response.json().then((value) => {
            if (value.player == 'good') {
                vm.otherPlayers += value.tied;
            } else {
                window.alert('Ah...you tied, but you cheated...');
            }
        });
    }
}

function handleDelete() {
    if (vm.currentWord.length > 0) {
        vm.currentWord.pop();
    } else if (vm.previousWords.length > 1) {
        vm.currentWord = vm.previousWords.pop().split('');
    }
}

function read_key(keypress) {
    if (keyboardLock) {
        return true;
    }

    if (keypress === 'Space') {
        keypress = ' ';
    }

    if (keypress.toUpperCase() === 'BACKSPACE' || keypress.toUpperCase() === 'DEL') {
        handleDelete();
    } else if (keypress.toUpperCase() === 'ENTER') {
        word = vm.$data.currentWord.join('');
        prev_words = vm.$data.previousWords;
        prev_word = prev_words[prev_words.length - 1];
        check_word(word, prev_word);
    } else {
        vm.$data.currentWord.push(keypress.toUpperCase());
    }
};

$(document).keydown(function(e) {
    // prevent backspace navigation
    if (e.keyCode == 8) {
        e.preventDefault();
        read_key('backspace');
    } else if (e.keyCode == 13) {
        read_key('enter');
    } else if (e.keyCode >= 65 && e.keyCode <= 90 || e.keyCode == 32) {
        read_key(String.fromCharCode(e.which));
    } else if (e.keyCode === 27) {
        $('#help-modal').addClass('hidden');
    } else {
        e.preventDefault();
    }
});


// Vue app

const IndelApp = {
    data() {
        return {
            currentWord: [],
            previousWords: [],
            targetWord: '',
            solvedBy: '',
            solvedIn: '',
            otherPlayers: 0
        }
    },
    computed: {
        andOthers() {
            if (this.otherPlayers > 0) {
                to_return = ` and ${this.otherPlayers} other`;
                if (this.otherPlayers > 1) {
                    to_return = to_return + 's';
                }
                return to_return;
            } else {
                return '';
            }
        },
        currWordEmpty() {
            return this.currentWord.length === 0;
        },
        currWordGuess() {
            if (this.currWordEmpty) {
                return `Guess ${this.previousWords.length}`;
            } else {
                return this.currentWord.join('') + '|';
            }
        },

    },
    compilerOptions: {
        delimiters: ['[[', ']]']
    }
}

async function setup() {
    const response = await fetch(indel_url, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json'
        },
        redirect: 'follow',
        referrerPolicy: 'no-referrer',
        body: JSON.stringify({
            "action": "setup"
        })
    });

    response.json().then((value) => {
        vm.previousWords.push(value.start_word.toLocaleUpperCase());
        vm.targetWord = value.target_word.toLocaleUpperCase();
        vm.solvedIn = value.current_best;
        vm.solvedBy = value.current_best_player;
        vm.otherPlayers = value.other_players;
    });
}

setup();

const vm = Vue.createApp(IndelApp).mount('#indel-app');

// Help modal
$('#help-launcher').click(() => {
    $('#help-modal')
        .removeClass('hidden');
})

$('#help-modal-close').click(() => {
    $('#help-modal').addClass('hidden');
})

$('#help-modal-content').click(function(e) {
    e.stopPropagation();
})

$('#help-modal').click(() => {
    $('#help-modal').addClass('hidden');
})
