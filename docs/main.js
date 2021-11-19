import StockChartPane from './stock-chart-pane.js';

addEventListener('load', function () {
	// チャートペインの初期化
	const chartPane = new StockChartPane(document.getElementById('chart'));

	// 時系列データの準備
	const demoData = makeDemoData(['デモ株式会社', '有限会社デモ', 'デモカンパニー', '株式会社でも', 'デモ']);

	// 銘柄の平均取得単価（の代わりに中央値を使用する）
	const names = Object.keys(demoData);
	const name = names[0];
	const averageCost = getCentralValue(demoData[name]);

	// 表示中の銘柄名（とか銘柄コード）
	chartPane.updateName(name);

	// 時系列データと平均取得単価を設定する（平均取得単価は省略可）
	chartPane.updateChart(demoData[name], averageCost);

	// サブチャート
	for (let i = 0; i < 4; ++i) {
		const chartPane = new StockChartPane(document.getElementById(`chart-sub${i + 1}`));
		const name = names[i + 1];
		const averageCost = getCentralValue(demoData[name]);
		chartPane.updateName(name);
		chartPane.updateChart(demoData[name], averageCost);
	}
});

/**
 * デモ用のダミー時系列データを生成する。時系列データは新しい日付順にする。
 * @returns 生成したダミーデータ
 */
function makeDemoData(corpNames) {
	const data = {};
	for (const corpName of corpNames) {
		const series = [];
		const nowDate = new Date();
		const avgVolume = 10000;
		const basePrice = (Math.random() * 200 + 1000) | 0;
		let prevPrice = basePrice;
		for (let i = 0; i < 365; ++i) {
			const pulse = prevPrice * .1 | 0;
			const r1 = Math.random() / 2 + .5;
			const r2 = Math.random();
			const price = (Math.sin(Math.random() + i / 180) * r1 * pulse + Math.sin(i / 15) * r2 * pulse | 0) + basePrice;
			const delta = price - prevPrice;
			const avg = (delta / 2 | 0) + prevPrice;
			const high = (Math.random() * delta * 1.5 + avg) | 0;
			const low = (Math.random() * delta * -1.5 + avg) | 0;

			const bigWeve = Math.abs(delta) / prevPrice > .9 ? .8 : .05;
			const volume = ((Math.random() - .5) * avgVolume * bigWeve | 0) + avgVolume * .1;

			const year = nowDate.getFullYear();
			const month = nowDate.getMonth() + 1;
			const day = nowDate.getDate();
			const date = [`${year}-${month}-${day}`, prevPrice, high, low, price, volume];
			series.push(date);
			nowDate.setDate(nowDate.getDate() - 1);
			prevPrice = price;
		}
		data[corpName] = series;
	}
	return data;
}

/**
 * 日々の終値の中央値を取得する
 * @param {Array} data 時系列データ
 * @returns 
 */
function getCentralValue(data) {
	const value = [];
	data.forEach(v => value.push(v[4]));
	value.sort();
	return value[value.length / 2 | 0];
}