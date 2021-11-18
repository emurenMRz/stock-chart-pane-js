/**
 * Parabolic
 */

export default class Parabolic {
	#SAR = 0; // Stop And Reverse Point
	#AF = 0;  // Acceleration Factor
	#EP = 0;  // Extreme Point

	#upTrend = true;
	#deltaAF = 0;
	#prevLow = 0;
	#prevHigh = 0;
	#prevClose = 0;

	constructor(deltaAF) {
		this.#deltaAF = deltaAF;
	}

	calc(low, high, close) {
		if (!this.#prevLow && !this.#prevHigh && !this.#prevClose)
			;
		else if (!this.#AF) {
			this.#AF = this.#deltaAF;
			this.#upTrend = close > this.#prevClose;
			if (this.#upTrend) {
				this.#EP = high;
				this.#SAR = this.#prevHigh;
			} else {
				this.#EP = low;
				this.#SAR = this.#prevLow;
			}
		} else {
			const prevTrend = this.#upTrend;
			const prevEP = this.#EP;
			this.#upTrend = this.#upTrend ? this.#SAR < low : this.#SAR < high;
			this.#EP = this.#upTrend ? (this.#SAR > low ? low : Math.max(high, this.#EP)) : (this.#SAR < high ? high : Math.min(low, this.#EP));
			if (this.#upTrend == prevTrend) {
				if (prevEP != this.#EP && this.#AF < .2)
					this.#AF += this.#deltaAF;
				this.#SAR += this.#AF * (this.#EP - this.#SAR);
			} else {
				this.#AF = this.#deltaAF;
				this.#SAR = prevEP;
			}
		}

		this.#prevLow = low;
		this.#prevHigh = high;
		this.#prevClose = close;
		return this.#SAR;
	}

	getTrend() { return this.#upTrend; }
}
