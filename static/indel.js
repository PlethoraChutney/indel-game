const indel_url = '/';
currentWord = [];
previousWords = [];

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
        newKey.classList.add('keyboard-key', 'unused');

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
        console.log(value);
    });
}

function read_key(keypress) {
    if (keypress.toUpperCase() === 'BACKSPACE' || keypress.toUpperCase() === 'DEL') {
        vm.$data.currentWord.pop();
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
    } else if (e.keyCode >= 65 && e.keyCode <= 90) {
        read_key(String.fromCharCode(e.which));
    } else {
        e.preventDefault();
    }
});

const IndelApp = {
    data() {
        return {
            currentWord: currentWord,
            previousWords: previousWords
        }
    },
    compilerOptions: {
        delimiters: ['[[', ']]']
    }
}

const vm = Vue.createApp(IndelApp).mount('#indel-app');

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
        console.log(value.start_word);
        vm.previousWords.push(value.start_word.toLocaleUpperCase());
    });
}

setup();