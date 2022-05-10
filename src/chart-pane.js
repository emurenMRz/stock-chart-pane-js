import StockChart from "./stock-chart.js";
import * as Utility from "./utility.js";

const $fragment = () => document.createDocumentFragment();
const $make = (tag, className) => {
	const e = document.createElement(tag);
	if (className)
		e.className = className;
	return e;
};

export default class StockChartPane {
	#elements = {};
	#setting = {};
	#chart = null;

	constructor(parent) {
		let chartWidth = +parent.dataset.chartWidth;
		let chartHeight = +parent.dataset.chartHeight;
		let dateRange = +parent.dataset.dateRange;
		if (!dateRange) dateRange = 180;
		if (!chartWidth) chartWidth = dateRange * 5;
		if (!chartHeight) chartHeight = 380 + 100;

		//Required style
		const parentStyle = getComputedStyle(parent);
		if (parentStyle.position == 'static')
			parent.style.position = 'relative';

		this.#elements.parent = parent;
		this.#elements.header = this.#buildHeader();
		this.#elements.chart = this.#buildChart(chartWidth, chartHeight);

		const chartZIndex = getComputedStyle(this.#elements.chart).zIndex;
		this.#elements.overlay = this.#buildOverlay(chartZIndex);

		this.#setting.dateRange = dateRange;

		parent.appendChild(this.#elements.header);
		parent.appendChild(this.#elements.chart);
		parent.appendChild(this.#elements.overlay.line);
		parent.appendChild(this.#elements.overlay.data);

		parent.addEventListener('mouseenter', m => this.#enterPane(m.clientX, m.clientY));
		parent.addEventListener('mousemove', m => this.#overPane(m.clientX, m.clientY));
		parent.addEventListener('mouseleave', m => this.#leavePane(m.clientX, m.clientY));
	}

	updateName(name) {
		const e = this.#elements.header.querySelector('.name');
		if (name instanceof HTMLElement) {
			e.textContent = '';
			e.appendChild(name);
		} else
			e.textContent = name;
	}

	updateChart(csv, averageCost) {
		this.#chart = new StockChart(this.#elements.chart);
		this.#chart.setData(csv, this.#setting.dateRange, averageCost);
		const nowPrice = this.#chart.nowPrice;
		this.#updatePrice(nowPrice);
		this.#updateDelta(nowPrice, averageCost);
		return nowPrice;
	}

	/*******************************
	  private - initialize
	*******************************/

	#buildHeader() {
		const e = $make('div', 'header');
		e.appendChild(this.#buildChangeModeButton());
		e.appendChild($make('span', 'name'));
		e.appendChild($make('span', 'price'));
		e.appendChild($make('span', 'delta'));
		return e;
	}

	#buildChangeModeButton() {
		const e = $make('div', 'changeMode');
		e.textContent = '株価チャート';
		e.style.display = 'inline-block';
		e.onclick = () => {
			if (!this.#chart)
				return;
			if (this.#chart.mode == StockChart.PERCENTAGE_CHANGE_MODE) {
				e.textContent = '株価チャート';
				this.#chart.mode = StockChart.PRICE_MODE;
			} else {
				e.textContent = '騰落率チャート';
				this.#chart.mode = StockChart.PERCENTAGE_CHANGE_MODE;
			}
		};
		return e;
	}

	#buildChart(width, height) {
		const e = $make('canvas');
		e.width = width;
		e.height = height;
		return e;
	}

	#buildOverlay(baseZIndex) {
		const line = $make('div', 'overlay line');
		const data = $make('div', 'overlay data');
		line.style.display = data.style.display = 'none';
		line.style.position = data.style.position = 'absolute';
		line.style.zIndex = data.style.zIndex = `${baseZIndex + 1}`;
		line.style.borderBottom = `solid 1px black`;

		const item = (key, name) => {
			const parent = $fragment();
			const dt = $make('dt');
			dt.textContent = key;
			parent.appendChild(dt);
			parent.appendChild($make('dd', name));
			return parent;
		};

		const dl = $make('dl');
		dl.appendChild(item('日付', 'date'));
		dl.appendChild(item('始値', 'open'));
		dl.appendChild(item('高値', 'high'));
		dl.appendChild(item('安値', 'low'));
		dl.appendChild(item('終値', 'close'));
		dl.appendChild(item('出来高', 'volume'));
		data.appendChild(dl);
		return { line, data };
	}

	/*******************************
	  private - update
	*******************************/

	#updatePrice(nowPrice) {
		const price = this.#elements.header.querySelector('.price');
		price.textContent = `：${Utility.formatPrice(nowPrice)}円`;
	}

	#updateDelta(nowPrice, averageCost) {
		const spanFrame = this.#elements.header.querySelector('.delta');
		spanFrame.textContent = '';

		const deltaSpan = averageCost => {
			const delta = nowPrice - averageCost;
			const rate = ((nowPrice / averageCost - 1) * 100).toFixed(3);
			const signPrice = v => (v > 0 ? '+' : '') + Utility.formatPrice(v);
			const sign = v => (v > 0 ? '+' : '') + v;

			const span = document.createElement('span');
			span.classList.toggle('plus', delta > 0);
			span.classList.toggle('minus', delta < 0);
			span.textContent = `(${signPrice(delta)}円 ${sign(rate)}%)`;
			spanFrame.appendChild(span);
		};

		if (typeof averageCost === 'number')
			deltaSpan(averageCost);
		else if (averageCost instanceof Array)
			for (const cost of averageCost)
				deltaSpan(cost);
	}

	/******************************************************************************
	  private - overlay
	******************************************************************************/

	#enterPane(mx, my) {
		const rect = this.#elements.chart.getBoundingClientRect();
		const width = rect.width | 0;
		const overlay = this.#elements.overlay.data;
		const line = this.#elements.overlay.line;
		overlay.style.position = 'absolute';
		overlay.style.display = 'block';
		line.style.width = `${width}px`;
		line.style.position = 'absolute';
		line.style.display = 'block';
	}

	#overPane(mx, my) {
		if (!this.#chart)
			return;

		const rect = this.#elements.chart.getBoundingClientRect();
		const width = rect.width | 0;
		const height = rect.height | 0;
		const x = mx - (rect.left | 0);
		const y = my - (rect.top | 0);

		if (!(x >= 0 && x < width && y >= 0 && y < height)) {
			this.#leavePane(mx, my);
			return;
		}

		const overlay = this.#elements.overlay.data;
		const line = this.#elements.overlay.line;

		if (overlay.style.display == 'none')
			this.#enterPane(mx, my);

		overlay.style.left = `${x}px`;
		overlay.style.top = `calc(${y}px + 2rem)`;

		const data = this.#chart.dateData(x, y);
		overlay.querySelector('.date').textContent = data.date;
		overlay.querySelector('.open').textContent = data.open;
		overlay.querySelector('.high').textContent = data.high;
		overlay.querySelector('.low').textContent = data.low;
		overlay.querySelector('.close').textContent = data.close;
		overlay.querySelector('.volume').textContent = data.volume;
		line.style.top = `${y}px`;
		line.textContent = data.line;
	}

	#leavePane(mx, my) {
		const overlay = this.#elements.overlay.data;
		const line = this.#elements.overlay.line;
		overlay.style.display = 'none';
		line.style.display = 'none';
	}
}
