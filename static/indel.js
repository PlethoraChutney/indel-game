const indel_url = '/';
let keyboardLock = false;

// create keyboard

const keyboardDiv = document.getElementById('keyboard');
for (const row of ['QWERTYUIOP', 'ASDFGHJKL', '<ZXCVBNM>', ' ']) {
    const newRow = document.createElement('div')
    for (let char of row) {
        if (char === '<') {
            char = 'Enter';
        } else if (char === '>') {
            char = 'Del';
        } else if (char === ' ') {
            char = 'Space';
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

$('.keyboard-key').on('tap', function() {
    var keyPressed = $(this).text();
    read_key(keyPressed);
});

async function check_word(word, prev_word) {
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
        if (value.word === 'True' && value.distance === 'True') {
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

            errorMessage(value);
        }
    });
}

function errorMessage(answerObject){
    messageText = []
    if (answerObject.word === 'False') {
        messageText.push('Not a word');
    }

    if (answerObject.word === 'False' && answerObject.distance === 'False') {
        messageText.push(' and t');
    } else if (answerObject.word === 'True') {
        messageText.push('T');
    } else {
        messageText.push('.');
    }

    if (answerObject.distance === 'False') {
        messageText.push('oo many changes.');
    }

    $('#error-modal-content')
        .text(messageText.join(''))
        .addClass('visible');

    window.setTimeout(() => {
        $('#error-modal-content')
            .removeClass('visible');
    }, 1000);
    
    $('#error-modal').removeClass('hidden');

    window.setTimeout(() => {
        $('#error-modal').addClass('hidden');
    }, 1000);
}

function puzzleComplete() {
    console.log('Puzzle complete!');
    keyboardLock = true;
    $('h1, hr, #keyboard, #previous-guesses')
        .not('#target-word, #game-title, #num-guesses')
        .fadeOut(2500);

    window.setTimeout(() => {
        $('#previous-guesses').addClass('hidden');
        $('#target-word').addClass('winner');
        $('#num-guesses').removeClass('hidden');
    }, 2500);
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

const IndelApp = {
    data() {
        return {
            currentWord: [],
            previousWords: [],
            targetWord: ''
        }
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