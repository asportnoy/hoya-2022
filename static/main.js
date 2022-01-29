let scoreText = document.getElementById('score');
let livesText = document.getElementById('lives');
let roundText = document.getElementById('round');
let nameText = document.getElementById('name');
let slider = document.getElementById('slider');
let sliderText = document.getElementById('slidertext');
let submit = document.getElementById('submit');

const MAX_VALUE = 200000;
const INITIAL_VALUE = MAX_VALUE / 2;
let number = INITIAL_VALUE;

let score = 0;

slider.addEventListener('input', handleSliderValue);

function handleSliderValue() {
	number = parseInt(slider.value);
	sliderText.innerText = `$${number.toLocaleString()} ${
		number == MAX_VALUE ? ' or more' : ''
	}`;
}

async function game() {
	// Connect to web server
	const ws = new WebSocket(`ws://${window.location.host}`);

	ws.addEventListener('message', data => {
		let json = JSON.parse(data.data);

		if (json.type == 'status') {
			scoreText.innerText = json.score.toLocaleString();
			livesText.innerText = json.lives.toLocaleString();
			roundText.innerText = json.round.toLocaleString();
		} else if (json.type == 'group') {
			slider.value = INITIAL_VALUE;
			handleSliderValue();
			roundText.innerText = json.round.toLocaleString();
			nameText.innerText = json.text;
		} else if (json.type == 'result') {
			alert(
				`${
					json.result
				}! Answer was ${json.answer.toLocaleString()}. +${json.pointsGained.toLocaleString()} points.`,
			);

			score = json.game.score;
			scoreText.innerText = json.game.score.toLocaleString();
			livesText.innerText = json.game.lives.toLocaleString();
		} else if (json.type == 'end') {
			alert(
				`Game over! ${
					json.message
				} Your score was ${score.toLocaleString()}.`,
			);
		}
	});

	submit.addEventListener('click', () => {
		ws.send(
			JSON.stringify({
				type: 'guess',
				guess: number,
			}),
		);
	});
}

game();
