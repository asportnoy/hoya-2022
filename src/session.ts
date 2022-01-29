import {RawData, WebSocket} from 'ws';
import data from './data.json';

const MAX_LIVES = 5;

export class Session {
	public socket: WebSocket;
	public guessedIds: number[] = [];
	public rounds = 0;
	public currentId!: number;
	public currentGroup!: typeof data[0];
	public score: number = 0;
	public lives: number = MAX_LIVES;

	constructor(socket: WebSocket) {
		this.socket = socket;

		this.socket.on('message', data => this.message(data));
		this.sendStatus();
		this.chooseGroup();
	}

	private message(data: RawData) {
		try {
			let string = data.toString();
			let json = JSON.parse(string);

			if (json.type === 'guess') {
				if (
					typeof json.guess !== 'number' ||
					json.guess < 0 ||
					json.guess % 1000 !== 0
				)
					return this.socket.close(1008); // 1008: The endpoint is terminating the connection because it received a message that violates its policy.
				this.guess(json.guess);
				if (this.lives <= 0) {
					this.sendJSON({
						type: 'end',
						message: 'You ran out of lives!',
					});
					this.socket.close(1000); // 1000: The connection successfully completed the purpose for which it was created.
					return;
				}
				this.chooseGroup();
			} else if (json.type === 'status') {
				this.sendStatus();
			} else if (json.type === 'end') {
				this.sendStatus();
				this.socket.close(1000); // 1000: The connection successfully completed the purpose for which it was created.
			}
		} catch (e) {
			try {
				this.socket.close(1003); // 1003: The connection is being terminated because the endpoint received data of a type it cannot accept.
			} catch (e) {}
		}
	}

	private sendJSON(json: any) {
		this.socket.send(JSON.stringify(json));
	}

	private guess(income: number) {
		let diff = Math.abs(income - this.currentGroup.salary);

		/*
		 * 0-1,000: correct; 1 life gained (if not already at max)
		 * 1,001-5,000: correct; no lives lost
		 * 5,001-10,000: close; 1 life lost
		 * 10,001+: incorrect; 2 lives lost
		 */
		let livesLost = 0;
		let result: 'CORRECT' | 'CLOSE' | 'INCORRECT' = 'CORRECT';
		if (diff > 10000) {
			result = 'INCORRECT';
			livesLost = 2;
		} else if (diff > 5000) {
			result = 'CLOSE';
			livesLost = 1;
		} else if (diff > 1000) {
			result = 'CORRECT';
			livesLost = 0;
		} else {
			result = 'CORRECT';
			livesLost = this.lives < MAX_LIVES ? -1 : 0;
		}
		this.lives -= livesLost;

		/*
		 * Score determined by how far off the guess was with the max difference of 10,000 and then divided by 100 and rounded to the nearest integer.
		 * Scores less than 0 will be set to 0
		 * Final range is 0-100
		 */
		let pointsGained = Math.round((10000 - diff) / 100);
		if (pointsGained < 0) pointsGained = 0;
		this.score += pointsGained;

		this.sendJSON({
			type: 'result',
			answer: this.currentGroup.salary,
			result,
			pointsGained,
			livesLost,
			game: {
				score: this.score,
				lives: this.lives,
				round: this.rounds,
			},
		});
	}

	private sendStatus() {
		this.sendJSON({
			type: 'status',
			score: this.score,
			lives: this.lives,
			round: this.rounds,
		});
	}

	private chooseGroup() {
		// Get a list of non-chosen groups
		let groups = data.filter((x, i) => !this.guessedIds.includes(i));
		// Handle the case where there are no groups left
		if (groups.length === 0) {
			this.sendJSON({
				type: 'end',
				message: 'No more groups to guess!',
			});
			this.socket.close(1000); // 1000: The connection successfully completed the purpose for which it was created.
			return;
		}
		// Choose a random group
		let index = Math.floor(Math.random() * groups.length);

		this.currentId = index;
		this.guessedIds.push(index);
		this.rounds++;
		this.currentGroup = groups[index];

		this.sendJSON({
			type: 'group',
			text: `${this.currentGroup.title} - ${this.currentGroup.area}`,
		});
	}
}
