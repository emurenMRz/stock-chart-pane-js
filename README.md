# stock-chart-pane-js

指定したHTMLElementに株価表示用のローソク足チャートを描画します。

## 動作確認ページ

Pages: https://emurenmrz.github.io/stock-chart-pane-js/

## 使い方

1. 必要なパッケージをインストールします。

```commandline
> npm install
```

2. ライブラリを生成します。

```commandline
> npm run build
```

3. 利用したいjsファイル内でimportし、オブジェクトを生成します。

```javascript
import StockChartPane from './stock-chart-pane.js';

// チャートペインの初期化
const chartPane = new StockChartPane(targetElement: HTMLElement);
```

4. 銘柄名（かコード）や描画する時系列データを指定するとチャートを描画します。

```javascript
// 表示中の銘柄名（とか銘柄コード）
chartPane.updateName(name: String);

// 時系列データと平均取得単価を設定する（平均取得単価は省略可）
chartPane.updateChart(data: Array[][], averageCost: Number);
```

対象HTMLElementのdatasetで表示サイズを変更できます。

```html
<div id="chart" data-chart-width="960" data-chart-height="480" data-date-range="192"></div>
```

 - `data-chart-width`：チャート描画を行うHTMLCanvasElementの幅です
 - `data-chart-height`：チャート描画を行うHTMLCanvasElementの高さです
 - `data-date-range`：描画する時系列データの（最新からの）日数です

具体的には`dist`フォルダ内のファイルを見てください。

## 挿入される要素

`new StockChartPane()`で指定した要素には以下の要素が追加されます。一部要素にはclassが指定されていますので、スタイルを変更する際の参考にしてください。

```html
<div id="chart" data-chart-width="960" data-chart-height="480" data-date-range="192">
	<div class="header">
		<div class="changeMode">株価チャート</div>
		<span class="name">デモ株式会社</span>
		<span class="price">：1,037円</span>
		<span class="delta minus">(-57円 -5.210%)</span>
	</div>
	<canvas width="960" height="480"></canvas>
	<div class="overlay line">1103</div>
	<div class="overlay data">
		<dl>
			<dt>日付</dt><dd class="date">2021/11/15</dd>
			<dt>始値</dt><dd class="open">1,032</dd>
			<dt>高値</dt><dd class="high">1,124</dd>
			<dt>安値</dt><dd class="low">973</dd>
			<dt>終値</dt><dd class="close">1,093</dd>
			<dt>出来高</dt><dd class="volume">778</dd>
		</dl>
	</div>
</div>
```