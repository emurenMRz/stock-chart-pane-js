/**
 * The image buffer for pixel drawing
 */

export default class Bitmap {
	#imageData = null;
	#width = 0;
	#height = 0;

	constructor(width, height) {
		this.#width = width;
		this.#height = height;
		this.#imageData = new ImageData(this.#width, this.#height);
	}

	get imageData() { return this.#imageData; }
	get width() { return this.#width; }
	get height() { return this.#height; }

	drawLine(x1, y1, x2, y2, color = 0x000000FF) {
		const img = new Uint32Array(this.#imageData.data.buffer);
		const pitch = this.#imageData.width;
		x1 |= 0, y1 |= 0, x2 |= 0, y2 |= 0;
		color = this.#color2bytes(color);

		if (y1 == y2) {
			const s = x1 < x2 ? x1 : x2;
			const e = x1 < x2 ? x2 : x1;
			const w = e - s;
			let o = y1 * pitch + s;
			for (let i = 0; i <= w; ++i, ++o)
				img[o] = color;
		}
		else if (x1 == x2) {
			const s = y1 < y2 ? y1 : y2;
			const e = y1 < y2 ? y2 : y1;
			const h = e - s;
			let o = s * pitch + x1;
			for (let i = 0; i <= h; ++i, o += pitch)
				img[o] = color;
		}
		else {
			const dx = Math.abs(x2 - x1);
			const dy = Math.abs(y2 - y1);
			const sx = x1 < x2 ? 1 : -1;
			const sy = y1 < y2 ? 1 : -1;
			let err = dx - dy;

			for (; ;) {
				img[y1 * pitch + x1] = color;
				if (x1 == x2 && y1 == y2)
					break;
				const e2 = err << 1;
				if (e2 > -dy) {
					err -= dy;
					x1 += sx;
				}
				if (e2 < dx) {
					err += dx;
					y1 += sy;
				}
			}
		}
	}

	drawRect(x, y, w, h, color = 0x000000FF) {
		const img = new Uint32Array(this.#imageData.data.buffer);
		const pitch = this.#imageData.width;
		x |= 0, y |= 0, w |= 0, h |= 0;
		color = this.#color2bytes(color);
		let o = y * pitch + x;
		for (let wy = h; wy > 0; --wy, o += pitch)
			for (let wx = 0; wx < w; ++wx)
				img[o + wx] = color;
	}

	clear(color = 0) {
		const img = new Uint32Array(this.#imageData.data.buffer);
		color = this.#color2bytes(color);
		for (let i = 0; i < img.length; ++i)
			img[i] = color;
	}

	rectAlpha(x, y, w, h, alpha) {
		const img = this.#imageData.data;
		const pitch = this.#imageData.width << 2;
		x |= 0, y |= 0, w = (w | 0) << 2, h |= 0;
		let o = y * pitch + (x << 2);
		for (let wy = h; wy > 0; --wy, o += pitch)
			for (let wx = 0; wx < w; wx += 4) {
				const offset = o + wx + 3;
				const a = img[offset];
				if (a)
					img[offset] = (a * alpha) | 0;
			}
	}

	#color2bytes(color) {
		const r = (color >> 24) & 0xff;
		const g = (color >> 16) & 0xff;
		const b = (color >> 8) & 0xff;
		const a = (color >> 0) & 0xff;
		return (a << 24) | (b << 16) | (g << 8) | r;
	}
}