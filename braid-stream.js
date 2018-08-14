/* jshint node:true */
'use strict';

const { Readable } = require('stream');

module.exports = function braid(sources) {
	if(!(sources instanceof Array)) {
		sources = Array.prototype.slice.call(arguments, 0);
	}

	var braidStreamOut = new Readable({
		highWaterMark: 1,
		read(size) {
			return doPushFromQueue();
		}
	});

	function doPushFromQueue() {
		if(!queues.includes(null)) {
			let idxSlow = queues.reduce((carry, item, idx, items) => items[carry] < items[idx] ? carry : idx, 0)
			let data = queues[idxSlow];

			queues[idxSlow] = null;
			braidStreamOut.push(data);
			sources[idxSlow].resume();
		}
		return false;
	}
	
	var queues = sources.map((source) => {
		source.on('data', function(data) {
			this.pause();
			queues[sources.indexOf(this)] = data.toString();
			doPushFromQueue();
		}.bind(source));
		source.on('end', () => sources.forEach(source => source.destroy()));
		
		return null;
	});
	
	return braidStreamOut;
};