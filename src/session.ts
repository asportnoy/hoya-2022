import {RawData, WebSocket} from 'ws';
import data from './data.json';
import living from './living-wage.json';

const MAX_LIVES = 7;
const MAX_VALUE = 200000;

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

	private guess(salary: number) {
		let closeThreshold;
		let okThreshold;

		let wage =
			living.find(x => x.new == this.currentGroup.area)!.wage * 40 * 50;
		let goodJob = this.currentGroup.salary >= wage;
		let correctAmount = this.currentGroup.salary;

		if (this.rounds <= 5) {
			closeThreshold = Math.max(7000, correctAmount * 0.2);
			okThreshold = Math.max(5000, correctAmount * 0.1);
		} else if (this.rounds <= 10) {
			closeThreshold = Math.max(5500, correctAmount * 0.15);
			okThreshold = Math.max(4500, correctAmount * 0.065);
		} else {
			closeThreshold = Math.max(4500, correctAmount * 0.1);
			okThreshold = Math.max(3500, correctAmount * 0.05);
		}

		let diff = Math.abs(salary - this.currentGroup.salary);

		// Handle salary over max value ("or more")
		let aboveMax =
			salary >= MAX_VALUE && this.currentGroup.salary >= MAX_VALUE;
		/*
		 * <= 1,000: correct; 2 lifes gained (if not already at max)
		 * <= 3,000: correct; 1 life gained (if not already at max)
		 * <= okThreshold: correct; no lives lost
		 * <= closeThreshold: close; 1 life lost
		 * > okThreshold: incorrect; 2 lives lost
		 */
		let livesLost = 0;
		let result: 'CORRECT' | 'CLOSE' | 'INCORRECT' = 'CORRECT';
		if (diff > closeThreshold && !aboveMax) {
			result = 'INCORRECT';
			livesLost = 2;
		} else if (diff > okThreshold && !aboveMax) {
			result = 'CLOSE';
			livesLost = 1;
		} else if (diff > 3000 || aboveMax) {
			result = 'CORRECT';
			livesLost = 0;
		} else if (diff > 1000) {
			result = 'CORRECT';
			livesLost = this.lives - Math.min(MAX_LIVES, this.lives + 1);
		} else {
			result = 'CORRECT';
			livesLost = this.lives - Math.min(MAX_LIVES, this.lives + 2);
		}
		this.lives -= livesLost;

		/*
		 * Score determined by how far off the guess was with the max difference of closeThreshold, divided by closeThreshold, multipled by 100, and rounded to the nearest integer.
		 * Scores less than 0 will be set to 0
		 * Final range is 0-100
		 */
		let pointsGained = aboveMax
			? 50
			: Math.round(((closeThreshold - diff) / closeThreshold) * 100);
		if (pointsGained < 0) pointsGained = 0;
		this.score += pointsGained;

		this.sendJSON({
			type: 'result',
			guess: salary,
			answer: this.currentGroup.salary,
			result,
			pointsGained,
			livesLost,
			livingWage: wage,
			salaryAboveLivingWage: goodJob,
			game: {
				score: this.score,
				lives: this.lives,
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
			title: `${this.currentGroup.title}`,
			location: `${this.currentGroup.area}`,
			round: this.rounds,
		});
	}
}
