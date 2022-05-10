import Queue from "./technical-analysis/queue.js";
import RSI from "./technical-analysis/rsi.js";
import Parabolic from "./technical-analysis/parabric.js";
import Bitmap from "./bitmap.js";
import * as Utility from "./utility.js";

export default class StockChart {
	static PRICE_MODE = 0;
	static PERCENTAGE_CHANGE_MODE = 1;

	#mode = StockChart.PRICE_MODE;
	#context = null;
	#graph = null;
	#lowLine = 0;
	#highLine = 10;
	#minPrice = 0;
	#maxPrice = 0;
	#averageCost = 0;
	#candleWidth = 0;
	#lowVolumeLine = 0;
	#highVolumeLine = 0;
	#maxVolume = 0;
	#db = [];
	#dateRange = 0;

	#minRate = 0.0;
	#maxRate = 0.0;
	#rateDb = undefined;

	#color = {
		averageCost: 0x00c4ff80,
		monthlySeparator: 0x00000040,
		horizonLine: 0x00000080,
		text: 0x000000ff,
		candle: {
			up: 0xff0000ff,
			down: 0x00a050ff,
		},
		volume: 0xffff00ff,
		MA: [
			0x0080ffff,
			0xff8000ff,
		],
		parabolic: {
			up: 0xff88ffff,
			down: 0x88ff88ff
		},
		RSI: {
			center: 0x404040ff,
			support: 0x202020ff,
			line: 0x000000ff,
		},
		rate: {
			center: 0x00ff80ff,
			support: 0x00ff80ff,
		}
	};

	constructor(canvas) {
		const width = canvas.clientWidth;
		const height = canvas.clientHeight;
		this.#context = canvas.getContext('2d');
		this.#graph = new Bitmap(width, height);
		if (!this.#context || !this.#graph)
			throw new TypeError('argument error in StockChart.constructor.');
		this.#lowLine = height - 110;
		this.#lowVolumeLine = height - 10;
		this.#highVolumeLine = height - 90;
	}

	get mode() { return this.#mode; }
	set mode(value) {
		this.#mode = value;
		if (value == StockChart.PRICE_MODE) {
			this.#drawChart();
			this.#showCanvas(this.#context);
		} else {
			this.#drawRateChart();
			this.#showCanvasByRate(this.#context);
		}
	}

	get averageCost() { return this.#averageCost; }
	get nowPrice() { return this.#db[0][4]; }

	dateData(x, y) {
		const w = this.#candleWidth;
		let index = this.#dateRange - (x / w | 0) - 1;
		if (index < 0)
			index = 0;
		const data = this.#db[index];
		const rate = this.#rateDb[index];
		const mode = this.#mode == StockChart.PRICE_MODE;
		return {
			date: data[0].join('/'),
			open: mode ? Utility.formatPrice(data[1]) : `${rate[0] / 100}%`,
			high: mode ? Utility.formatPrice(data[2]) : `${rate[1] / 100}%`,
			low: mode ? Utility.formatPrice(data[3]) : `${rate[2] / 100}%`,
			close: mode ? Utility.formatPrice(data[4]) : `${rate[3] / 100}%`,
			volume: Utility.formatPrice(data[5]),
			line: mode ? this.#fromPixelInRange(y, this.#minPrice, this.#maxPrice) : `${this.#fromPixelInRange(y, this.#minRate, this.#maxRate) / 100}%`
		};
	}

	/**
	 * 時系列データをセットする
	 * @param {Array[]} db 新しい日付順の時系列データ。[0]日付、[1]始値、[2]高値、[3]安値、[4]終値、[5]出来高(、[6]売買代金)
	 * @param {Number} dateRange 表示する日数
	 * @param {Number|Array} averageCost 平均取得単価。保持していない銘柄の場合は0。配列で複数の値を渡すことができる
	 */
	setData(db, dateRange, averageCost = 0) {
		for (const v of db)
			v[0] = v[0].split('-');

		dateRange |= 0;
		if (dateRange > db.length)
			dateRange = db.length;

		let yMinPrice = Number.MAX_VALUE;
		let yMaxPrice = Number.MIN_VALUE;
		let maxVolume = 0;

		//最安値・最高値・最高出来高
		for (let i = 0; i < dateRange; ++i) {
			const high = db[i][2];
			const low = db[i][3];
			const volume = db[i][5];

			if (low < yMinPrice)
				yMinPrice = low;
			if (high > yMaxPrice)
				yMaxPrice = high;
			if (volume > maxVolume)
				maxVolume = volume;
		}

		//騰落率計算
		let minRate = Number.MAX_VALUE;
		let maxRate = Number.MIN_VALUE;
		let prevClose = db[dateRange - 1][4];
		let rateDb = [[0, 0, 0, 0]];

		for (let i = dateRange - 2; i >= 0; --i) {
			const close = db[i][4];

			const rate = [
				(db[i][1] / prevClose - 1) * 10000 | 0,
				(db[i][2] / prevClose - 1) * 10000 | 0,
				(db[i][3] / prevClose - 1) * 10000 | 0,
				(close / prevClose - 1) * 10000 | 0
			];
			if (rate[1] > maxRate)
				maxRate = rate[1];
			if (rate[2] < minRate)
				minRate = rate[2];

			rateDb.push(rate);
			prevClose = close;
		}

		this.#minPrice = yMinPrice;
		this.#maxPrice = yMaxPrice;
		this.#averageCost = averageCost;
		this.#candleWidth = this.#graph.width / dateRange;
		this.#maxVolume = maxVolume;
		this.#db = db;
		this.#dateRange = dateRange;

		this.#minRate = minRate;
		this.#maxRate = maxRate;
		this.#rateDb = rateDb.reverse();

		this.#drawChart();
		this.#showCanvas(this.#context);
	}

	/**
	 * グリッドなど共通要素の描画
	 * @param {Number} minPos 描画範囲の最低値
	 * @param {Number} maxPos 描画範囲の最高値
	 * @param {Function} toPixel 値を座標に変換する関数
	 */
	#drawChartCommon(minPos, maxPos, toPixel) {
		this.#graph.clear();

		const db = this.#db;
		const dateRange = this.#dateRange;

		//月次の区切り線
		let x = 0;
		const w = this.#candleWidth;
		let m = db[dateRange - 1][0][1];
		for (let i = dateRange - 1; i >= 0; --i) {
			const month = db[i][0][1];
			if (month != m) {
				this.#graph.drawLine(x, 0, x, this.#graph.height, this.#color.monthlySeparator);
				m = month;
			}
			x += w;
		}

		//最高値・最安値の価格線
		this.#graph.drawLine(0, minPos, this.#graph.width, minPos, this.#color.horizonLine);
		this.#graph.drawLine(0, maxPos, this.#graph.width, maxPos, this.#color.horizonLine);

		//出来高最高値・最低値の横線
		this.#graph.drawLine(0, this.#lowVolumeLine, this.#graph.width, this.#lowVolumeLine, this.#color.horizonLine);
		this.#graph.drawLine(0, this.#highVolumeLine, this.#graph.width, this.#highVolumeLine, this.#color.horizonLine);

		//RSI横線
		const per50 = (this.#lowVolumeLine - this.#highVolumeLine) / 2 + this.#highVolumeLine;
		this.#graph.drawLine(0, per50 - 25, this.#graph.width, per50 - 25, this.#color.RSI.support);
		this.#graph.drawLine(0, per50, this.#graph.width, per50, this.#color.RSI.center);
		this.#graph.drawLine(0, per50 + 25, this.#graph.width, per50 + 25, this.#color.RSI.support);

		//出来高チャート
		x = 0;
		for (let i = dateRange - 1; i >= 0; --i) {
			this.#drawVolumeBar(x, w, db[i][5]);
			x += w;
		}

		//移動平均線、RSI
		x = 0;
		const que5 = new Queue(5);
		const que25 = new Queue(25);
		const rsi = new RSI(14);
		const parabolic = new Parabolic(.02);
		let prev5 = 0;
		let prev25 = 0;
		let prevRsi = 0;
		for (let i = dateRange + 25; i >= 0; --i) {
			if (i >= db.length)
				continue;

			const close = db[i][4];
			const cx = w / 2 + x;

			if (toPixel) {
				if (que5.push(close)) {
					const v = toPixel(que5.calc());
					if (prev5 > 0 && i < dateRange - 1)
						this.#graph.drawLine(cx - w, prev5, cx, v, this.#color.MA[0]);
					prev5 = v;
				}

				if (que25.push(close)) {
					const v = toPixel(que25.calc());
					if (prev25 > 0 && i < dateRange - 1)
						this.#graph.drawLine(cx - w, prev25, cx, v, this.#color.MA[1]);
					prev25 = v;
				}

				const v = toPixel(parabolic.calc(db[i][2], db[i][3], close));
				if (i < dateRange - 1)
					this.#graph.drawRect(x + 1, v - 1, w - 2, 3, parabolic.getTrend() ? this.#color.parabolic.up : this.#color.parabolic.down);
			}

			if (rsi.push(close)) {
				const v = this.#graph.height - rsi.value;
				if (i < dateRange - 1)
					this.#graph.drawLine(cx - w, prevRsi, cx, v, this.#color.RSI.line);
				prevRsi = v;
			}

			if (i > dateRange - 1)
				continue;
			x += w;
		}
	}

	#showCanvasCommon(ctx) {
		this.#graph.rectAlpha(0, 0, 50, this.#graph.height, .25);
		ctx.putImageData(this.#graph.imageData, 0, 0);

		//出来高チャート
		ctx.fillStyle = '#' + this.#color.text.toString(16);
		ctx.fillText(Utility.formatPrice(this.#maxVolume), 0, this.#highVolumeLine);

		//日付区切り
		const width = this.#graph.width;
		const db = this.#db;
		const dateRange = this.#dateRange;
		const w = this.#candleWidth;
		let x = 0;
		let m = db[dateRange - 1][0][1];
		for (let i = dateRange - 1; i >= 0; --i) {
			const date = db[i][0];
			if (date[1] != m) {
				ctx.fillText(` ${date[0]}/${date[1] | 0}`, x, this.#lowLine + 10);
				m = date[1];
			}
			x += w;
			if (x >= width - 64)
				break;
		}
	}

	/**
	 * 
	 */
	#drawChart() {
		const toPixel = v => this.#toPixelInRange(v, this.#minPrice, this.#maxPrice);
		this.#drawChartCommon(toPixel(this.#minPrice), toPixel(this.#maxPrice), toPixel);

		//平均取得単価
		const avgCostLine = avgCost => {
			if (avgCost > this.#minPrice && avgCost < this.#maxPrice) {
				const averagePos = toPixel(avgCost);
				this.#graph.drawLine(0, averagePos, this.#graph.width, averagePos, this.#color.averageCost);
			}
		};

		if (typeof this.#averageCost === 'number')
			avgCostLine(this.#averageCost);
		else
			for (const cost of this.#averageCost)
				avgCostLine(cost);

		//ローソク足チャート
		const w = this.#candleWidth;
		const maxRange = this.#maxPrice - this.#minPrice;
		let x = 0;
		for (let i = this.#dateRange - 1; i >= 0; --i) {
			const data = this.#db[i];
			this.#drawCandlestick(x, w, data[1], data[2], data[3], data[4], toPixel, maxRange);
			x += w;
		}
	}

	#showCanvas(ctx) {
		const toPixel = v => this.#toPixelInRange(v, this.#minPrice, this.#maxPrice);
		this.#showCanvasCommon(ctx);

		//株価チャート
		ctx.fillStyle = '#' + this.#color.text.toString(16);
		ctx.fillText(Utility.formatPrice(this.#minPrice), 0, toPixel(this.#minPrice));
		ctx.fillText(Utility.formatPrice(this.#maxPrice), 0, toPixel(this.#maxPrice));

		const avgCostText = avgCost => {
			if (avgCost > this.#minPrice && avgCost < this.#maxPrice)
				ctx.fillText(Utility.formatPrice(avgCost), 0, toPixel(avgCost));
		};

		if (typeof this.#averageCost === 'number')
			avgCostText(this.#averageCost);
		else
			for (const cost of this.#averageCost)
				avgCostText(cost);
	}

	/**
	 * 
	 */
	#drawRateChart() {
		const toPixel = v => this.#toPixelInRange(v, this.#minRate, this.#maxRate);
		this.#drawChartCommon(toPixel(this.#minRate), toPixel(this.#maxRate));

		//0%
		const basePos = toPixel(0);
		const rateP5Pos = toPixel(500);
		const rateM5Pos = toPixel(-500);
		this.#graph.drawLine(0, basePos, this.#graph.width, basePos, this.#color.rate.center);
		this.#graph.drawLine(0, rateP5Pos, this.#graph.width, rateP5Pos, this.#color.rate.support);
		this.#graph.drawLine(0, rateM5Pos, this.#graph.width, rateM5Pos, this.#color.rate.support);

		//ローソク足チャート
		const w = this.#candleWidth;
		const maxRange = this.#maxRate - this.#minRate;
		let x = 0;
		for (let i = this.#dateRange - 1; i >= 0; --i) {
			const data = this.#rateDb[i];
			this.#drawCandlestick(x, w, data[0], data[1], data[2], data[3], toPixel, maxRange);
			x += w;
		}
	}

	#showCanvasByRate(ctx) {
		const toPixel = v => this.#toPixelInRange(v, this.#minRate, this.#maxRate);
		this.#showCanvasCommon(ctx);

		//チャート
		ctx.fillStyle = '#' + this.#color.text.toString(16);
		ctx.fillText(`${this.#minRate / 100}%`, 0, toPixel(this.#minRate));
		ctx.fillText(`${this.#maxRate / 100}%`, 0, toPixel(this.#maxRate));
		ctx.fillText('0%', 0, toPixel(0));
		if (this.#maxRate > 500)
			ctx.fillText('5%', 0, toPixel(500));
		if (this.#minRate < 500)
			ctx.fillText('-5%', 0, toPixel(-500));
	}

	/**
	 * 指定範囲を基準に値を座標に変換する
	 * @param {Number} v 変換する値
	 * @param {Number} min 範囲の最低値
	 * @param {Number} max 範囲の最高値
	 * @returns 
	 */
	#toPixelInRange(v, min, max) {
		const range = max - min;
		const baseLine = this.#highLine;
		const lineRange = this.#lowLine - baseLine;
		return (lineRange - (v - min) / range * lineRange + baseLine) | 0;
	}

	/**
	 * 指定範囲を基準に座標を値に変換する
	 * @param {Number} p 変換する座標
	 * @param {Number} min 範囲の最低値
	 * @param {Number} max 範囲の最高値
	 * @returns 
	 */
	#fromPixelInRange(p, min, max) {
		const baseLine = this.#highLine;
		const lineRange = this.#lowLine - baseLine;
		const range = max - min;
		return (range - (p - baseLine) / lineRange * range + min) | 0;
	}

	/**
	 * ローソク足を描画する
	 * @param {Number} x 描画開始X座標
	 * @param {Number} w 描画する幅
	 * @param {Number} open 始値
	 * @param {Number} high 高値
	 * @param {Number} low 安値
	 * @param {Number} close 終値
	 * @param {Function} toPixel 値を座標に変換する関数
	 * @param {Number} maxRange グラフ中の最大値幅
	 */
	#drawCandlestick(x, w, open, high, low, close, toPixel, maxRange) {
		const yinyang = open < close;
		const y = toPixel(yinyang ? close : open);
		const cx = (w / 2 | 0) + (x | 0);
		let h = (Math.abs(close - open) / maxRange * (this.#lowLine - this.#highLine)) | 0;
		if (h <= 0)
			h = 1;

		const color = yinyang ? this.#color.candle.up : this.#color.candle.down;
		this.#graph.drawLine(cx, toPixel(low), cx, toPixel(high), color);
		this.#graph.drawRect(x, y, w, h, color);
	}

	/**
	 * 出来高バーを描画する
	 * @param {Number} x 描画開始X座標
	 * @param {Number} w 描画する幅
	 * @param {Number} volume 出来高
	 * @returns 
	 */
	#drawVolumeBar(x, w, volume) {
		const h = (volume / this.#maxVolume * (this.#lowVolumeLine - this.#highVolumeLine - 1)) | 0;
		if (h <= 0) return;
		this.#graph.drawRect(x, this.#lowVolumeLine - h, w, h, this.#color.volume);
	}
}