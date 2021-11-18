/**
 * Fixed size queue.
 * For calculating moving average values.
 */

 export default class Queue {
	#q = null;

	constructor(size) {
		this.#q = new Array(size);
		this.#q.fill(-1);
	}

	push(v) {
		this.#q.push(v);
		this.#q.shift();
		return this.#q[0] != -1;
	}

	calc() { return this.#q.reduce((p, c) => p + c) / this.#q.length; }
}
