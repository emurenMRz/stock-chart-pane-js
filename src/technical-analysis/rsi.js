/**
 * RSI: Relative Strength Index
 */

export default class RSI {
	#array = [];
	#last = 0;
	#period = 0;
	#value = 0;

	constructor(period = 14) {
		this.#period = period;
	}

	get value() { return this.#value; }

	push(price) {
		if (price < 0)
			return false;

		if (this.#last == 0) {
			this.#last = price;
			return false;
		}

		this.#array.push(price - this.#last);
		this.#last = price;
		if (this.#array.length < this.#period)
			return false;

		let up = 0;
		let down = 0;

		for (const v of this.#array) {
			if (v >= 0)
				up += v;
			else
				down += v;
		}
		down = -down;
		this.#array.shift();

		if (up + down == 0)
			return false;

		this.#value = (up / (up + down) * 100) | 0;
		return true;
	}
}