'use strict';

var getJson;
if (typeof fetch === 'undefined') {
	getJson = url => new Promise((accept, reject) => window.$.getJSON(url).then(accept, reject)).catch(response => {
		throw response.responseJSON || response.responseText || response;
	});
} else {
	getJson = url => Promise.resolve(fetch(url)).then(response => {
		if (response.ok) {
			return response.json();
		}
		return response.json().then(json => {
			throw json;
		});
	});
}

function urlify(object) {
	var queryParams = [];
	for (var key in object) {
		queryParams.push(key + '=' + object[key]);
	}
	return '?' + queryParams.join('&');
}

function split(array, max) {
	const chunkCount = Math.ceil(array.length / max);
	const chunkSize = Math.ceil(array.length / chunkCount);
	const result = [];
	for (var start = 0, end; start < array.length; start = end) {
		end = Math.round(start + chunkSize);
		result.push(array.slice(start, end));
	}
	return result;
}

function Api(options) {
	if (!options) {
		options = {};
	}
	this.options = {
		key: options.key,
		keyPrefix: 'gw2-api-' || options.keyPrefix,
		rootUrl: 'https://api.guildwars2.com/v2/' || options.rootUrl,
		saveDelay: 1000 || options.saveDelay,
		cacheTimes: {
			default: 60 * 60 * 1000,
			global: 7 * 24 * 60 * 60 * 1000
		}
	};
	if (options.cacheTimes) {
		for (var key in options.cacheTimes) {
			this.options.cacheTimes[key] = options.cacheTimes[key];
		}
	}

	this.pending = {};
	this.cache = JSON.parse(localStorage.getItem(this.options.keyPrefix + this.options.key) || '{}');

	setInterval(() => {
		this.expireOthers();
		this.expireAll();
	}, 60 * 60 * 1000);
}

Api.prototype = {
	save: function () {
		if (this.timeoutId) {
			this.timeoutId = clearTimeout(this.timeoutId);
		}
		this.timeoutId = setTimeout(() => {
			delete this.timeoutId;
			this.cache.deleteAfter = Date.now() + this.options.cacheTimes.global;
			localStorage.setItem(this.options.keyPrefix + this.options.key, JSON.stringify(this.cache));
		}, this.options.saveDelay);
	},

	getCacheTime: function (endpoint) {
		var endpointPiece;
		var pos;

		while (pos !== -1) {
			endpointPiece = endpoint.slice(0, pos);
			if (this.options.cacheTimes[endpointPiece]) {
				return this.options.cacheTimes[endpointPiece];
			}
			pos = endpoint.lastIndexOf('/', pos - 1);
		}
		return this.options.cacheTimes.default;
	},

	expire: function (endpoint, querystring) {
		var request = endpoint + querystring;
		if (this.cache[request]) {
			var expireDate = this.cache[request][0] + this.getCacheTime(endpoint);
			if (!this.cache[request][1] || expireDate < Date.now()) {
				delete this.cache[request];
				this.save();
			}
		}
	},

	expireAll: function () {
		for (var request in this.cache) {
			if (request === '') {
				continue;
			}
			this.expire(request);
		}
	},

	expireOthers: function () {
		for (var key in localStorage) {
			if (this.options.keyPrefix + this.options.key === key || key.indexOf(this.options.keyPrefix) !== 0) {
				continue;
			}
			var data = JSON.parse(localStorage.getItem(key) || '{}');
			if (data.deleteAfter < Date.now()) {
				localStorage.removeItem(key);
			}
		}
	},

	getCached: function (endpoint, querystring) {
		this.expire(endpoint, querystring);
		return this.cache[endpoint + querystring] && this.cache[endpoint + querystring][1];
	},

	setCache: function (value, request) {
		this.cache[request] = [Date.now(), value];
		this.save();
	},

	getPending: function (request) {
		return this.pending[request];
	},

	setPending: function (request, promise) {
		if (promise === undefined) {
			delete this.pending[request];
		} else {
			this.pending[request] = promise;
		}
	},

	getFromApi: function (endpoint, params) {
		var querystring = urlify(params);
		var cached = this.getCached(endpoint, querystring);
		if (cached) {
			return Promise.resolve(cached);
		}

		var request = endpoint + querystring;
		var pending = this.getPending(request);
		if (pending) {
			return pending;
		}

		var promise = getJson(this.options.rootUrl + request + '&access_token=' + this.options.key);
		this.setPending(request, promise);
		return promise.then(data => {
			this.setCache(data, request);
			this.setPending(request);
			return data;
		});
	},

	getMultiple: function (endpoint, params) {
		var requests = split(params.ids, 100).map(ids => {
			var splittedParams = Object.assign({}, params, { ids });
			return this.getFromApi(endpoint, splittedParams);
		});
		return Promise.all(requests)
			.then(dataList => Array.prototype.concat.apply([], dataList));
	},

	get: function (endpoint, params) {
		if (params && params.ids) {
			return this.getMultiple(endpoint, params);
		}
		return this.getFromApi(endpoint, params);
	}

};
