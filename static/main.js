// Sections
let gameSection = document.getElementById('game');
let resultsSection = document.getElementById('result');
// Game Section
let scoreText = document.getElementById('score');
let livesText = document.getElementById('lives');
let roundText = document.getElementById('round');
let nameText = document.getElementById('name');
let locText = document.getElementById('location');
let slider = document.getElementById('slider');
let sliderText = document.getElementById('slidertext');
let submit = document.getElementById('submit');
// Results Section
let resText = document.getElementById('res-text');
let resGuess = document.getElementById('res-guess');
let resSalary = document.getElementById('res-salary');
let resPoints = document.getElementById('res-points');
let resScore = document.getElementById('res-score');
let resLives = document.getElementById('res-lives');
let resNext = document.getElementById('res-next');
let resRestart = document.getElementById('res-restart');

const MAX_HEARTS = 7;
const MAX_VALUE = 200000;
const INITIAL_VALUE = MAX_VALUE / 2;
let number = INITIAL_VALUE;

let score = 0;

let guessing = true;

slider.addEventListener('input', handleSliderValue);

function handleSliderValue() {
	number = parseInt(slider.value);
	sliderText.innerText = `${number.toLocaleString('en-US', {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: 0,
	})} ${number == MAX_VALUE ? ' or more' : ''}`;
}

function heartHTML(count) {
	let html = '';
	for (let i = 0; i < MAX_HEARTS; i++) {
		html += `<span style="opacity: ${
			i >= count ? 0.25 : 1
		};">\u2665</span>`;
	}
	return html;
}

resNext.addEventListener('click', () => {
	gameSection.style.display = '';
	resultsSection.style.display = 'none';
	guessing = true;
});

resRestart.addEventListener('click', () => {
	guessing = true;
	game();
});

async function game() {
	// Reset
	number = 0;
	score = 0;
	scoreText.innerText = 'Score: 0';
	livesText.innerHTML = heartHTML(MAX_HEARTS);
	roundText.innerText = 'Round #1';
	nameText.innerText = 'Loading...';
	locText.innerText = '';
	slider.value = INITIAL_VALUE;
	handleSliderValue();
	resNext.style.display = '';
	resRestart.style.display = 'none';
	gameSection.style.display = '';
	resultsSection.style.display = 'none';

	// Connect to web server
	const ws = new WebSocket(`ws://${window.location.host}`);

	ws.addEventListener('message', data => {
		let json = JSON.parse(data.data);

		if (json.type == 'status') {
			scoreText.innerText = `${json.score.toLocaleString()} points`;
			livesText.innerHTML = heartHTML(json.lives);
			roundText.innerText = `Round #${json.round.toLocaleString()}`;
		} else if (json.type == 'group') {
			// New thing to guess
			slider.value = INITIAL_VALUE;
			handleSliderValue();
			roundText.innerText = `Round #${json.round.toLocaleString()}`;
			nameText.innerText = json.title;
			locText.innerText = json.location;
		} else if (json.type == 'result') {
			// Result of guess
			gameSection.style.display = 'none';
			resultsSection.style.display = '';

			resText.innerText = `${
				json.game.lives <= 0 ? 'GAME OVER' : json.result
			}!`;
			resGuess.innerText = json.guess.toLocaleString('en-US', {
				style: 'currency',
				currency: 'USD',
				maximumFractionDigits: 0,
			});
			resSalary.innerText = json.answer.toLocaleString('en-US', {
				style: 'currency',
				currency: 'USD',
				maximumFractionDigits: 0,
			});
			resPoints.innerText = json.pointsGained.toLocaleString();
			resScore.innerText = json.game.score.toLocaleString();
			resLives.innerHTML = heartHTML(json.game.lives);
			score = json.game.score;
			scoreText.innerText = `${json.game.score.toLocaleString()} points`;
			livesText.innerHTML = heartHTML(json.game.lives);
		} else if (json.type == 'end') {
			submit.removeEventListener('click', submitClick);
			if (guessing) {
				game();
			} else {
				resNext.style.display = 'none';
				resRestart.style.display = '';
			}
		}
	});

	function submitClick() {
		if (ws.readyState !== ws.OPEN) game();
		guessing = false;
		ws.send(
			JSON.stringify({
				type: 'guess',
				guess: number,
			}),
		);
	}

	submit.addEventListener('click', submitClick);
}

game();
