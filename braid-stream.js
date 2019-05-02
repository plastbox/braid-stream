/* jshint node:true */
'use strict';

const { Readable } = require('stream');

module.exports = function braid(sources, options={}) {
	if(!(sources instanceof Array)) {
		sources = Array.prototype.slice.call(arguments, 0);
		if(!sources[sources.length - 1]._readableState) {
			options = sources.pop();
		}
		else {
			options = {
				autoDestroy: false
			};
		}
	}
	//console.log(`[BraidStream] :: options`, options);
	var isDestroyed = false;
	var braidStreamOut = new Readable({
		highWaterMark: 1,
		read(size) {
			return doPushFromQueue();
		},
		destroy(err, callback) {
			//console.log(`[BraidStream] :: destroy`);
			if(!isDestroyed) {
				isDestroyed = true;
				queues = sources.map(source => {
					source.destroy();
					return null;
				});
			}
			callback(err);
		}
	});

	function doPushFromQueue() {
		if(!queues.includes(null)) {
			let idxSlow = queues.reduce((carry, item, idx, items) => items[carry] < items[idx] ? carry : idx, 0);
			let data = queues[idxSlow];

			queues[idxSlow] = null;
			braidStreamOut.push(data);
			sources[idxSlow].resume();
		}
		return false;
	}
	
	var queues = sources.map(source => {
		source.on('data', function(data) {
			this.pause();
			queues[sources.indexOf(this)] = data.toString();
			doPushFromQueue();
		}.bind(source));


		source.on('end', removeSource.bind(this, source, 'end'));
		source.on('close', removeSource.bind(this, source, 'close'));

		return null;
	});

	function removeSource(source, eventName) {
		var idx = sources.indexOf(source);
		//console.log(`[BraidStream] :: removeSource ${eventName} ${idx}`);
		if(options.autoDestroy) {
			braidStreamOut.destroy();
		}
		else {
			//console.log(`[BraidStream] :: source end ${idx}, remove source`);
			sources.splice(idx, 1);
			queues.splice(idx, 1);
			if(sources.length === 0) {
				braidStreamOut.destroy();
			}
			else {
				doPushFromQueue();
			}
		}
	}
	
	return braidStreamOut;
};
