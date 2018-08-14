/* jshint node:true */
'use strict';

const braid = require('./braid-stream.js');
const { Readable, Writable } = require('stream');

class RandomIntervalSource extends Readable {
	constructor(options) {
		super(options);
		options = Object.assign({
				closeAfter: null,
				label: '',
				intervalMin: 100,
				intervalMax: 200
			}, options);
		this.closeAfter = options.closeAfter;
		this.label = options.label;
	}
	_read(size) {
		setTimeout(() => {
			this.counter = (this.counter || 0) + 1;
			this.push(`${(new Date()).toISOString()} source: ${this.label}`);
			if(this.closeAfter && this.counter === this.closeAfter) {
				this.push(null);
			}
		}, this.intervalMin + Math.floor(Math.random() * this.intervalMax));
	}
}
var source1 = new RandomIntervalSource({label: '1', closeAfter: 100000});
var source2 = new RandomIntervalSource({label: '2', });
var source3 = new RandomIntervalSource({label: '3', });
var source4 = new RandomIntervalSource({label: '4', });

var sink = new Writable({
	write: function(chunk, encoding, next) {
		if(!this.last) {
			this.last = chunk.toString();
		}
		if(chunk.toString() < this.last) {
			throw 'No moving backwards, please!';
		}
		//console.log(chunk.toString());
		next();
	}
});
//braid([source1, source2, source3]);
braid(source1, source2, source3, source4).pipe(sink);