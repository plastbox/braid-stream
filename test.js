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
		this.pushTimer = null;
	}
	_read(size) {
		var id = Math.floor(Math.random() * 8999) + 1000;
		//console.log('---------------------------- READ', id, this.label, this.counter, this.readable);
		(function(id) {
			if(this.closeAfter) {
				if(this.counter === this.closeAfter) {
					console.log('----------------------------CLOSE', id, this.label, this.counter, this.readable);
					this.push(null);
				}
			}
			if(!this.closeAfter || (this.counter || 0) < this.closeAfter) {
				//console.log('---------------------------- TIME', id, this.label, this.counter, this.readable);
				clearTimeout(this.pushTimer);
				this.pushTimer = setTimeout(() => {
					//console.log('---------------------------- PUSH', id, this.label, this.counter, this.readable);
					this.counter = (this.counter || 0) + 1;
					try {
						this.push(`${(new Date()).toISOString()} source: ${this.label}`);
					} catch(e) {
						console.log('----------------------------ERROR', id, this.label, this.counter, this.readable);
						throw(e);
					}
					
				}, this.intervalMin + Math.floor(Math.random() * this.intervalMax));
			}
		}).call(this, id);	
	}
	_destroy(err, callback) {
		console.log('--------------------------DESTROY', err, this.label, this.counter, this.readable);
		this.push(null);
		clearTimeout(this.pushTimer);
		callback(err);
	}
}
var source1 = new RandomIntervalSource({label: '1', closeAfter: 40});
var source2 = new RandomIntervalSource({label: '2', closeAfter: 30});
var source3 = new RandomIntervalSource({label: '3', closeAfter: 20});
var source4 = new RandomIntervalSource({label: '4', closeAfter: 10});

var sink = new Writable({
	write: function(chunk, encoding, next) {
		if(!this.last) {
			this.last = chunk.toString();
		}
		if(chunk.toString() < this.last) {
			throw 'No moving backwards, please!';
		}
		console.log(chunk.toString());
		next();
	}
});
//braid([source1, source2, source3]);
braid(source1, source2, source3, source4, {autoDestroy: true}).pipe(sink);