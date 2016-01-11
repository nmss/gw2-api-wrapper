'use strict';

var getJson;
if (typeof fetch === 'undefined') {
	getJson = url => new Promise((accept, reject) => window.$.getJSON(url).then(accept, reject)).catch(response => {
		throw response.responseJSON || response.responseText || response;
	});
} else {
	getJson = url => fetch(url).then(response => {
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
			default: 60 * 60 * 1000
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
	save: function() {
		if (this.timeoutId) {
			this.timeoutId = clearTimeout(this.timeoutId);
		}
		this.timeoutId = setTimeout(() => {
			delete this.timeoutId;
			this.cache.lastSave = Date.now();
			localStorage.setItem(this.options.keyPrefix + this.options.key, JSON.stringify(this.cache));
		}, this.options.saveDelay);
	},

	getCacheTime: function (endpoint) {
		return this.options.cacheTimes[endpoint] || this.options.cacheTimes.default;
	},

	expire: function (endpoint) {
		if (this.cache[endpoint]) {
			let expireDate = this.cache[endpoint][0] + this.getCacheTime(endpoint);
			if (!this.cache[endpoint][1] || expireDate < Date.now()) {
				delete this.cache[endpoint];
				this.save();
			}
		}
	},

	expireAll: function () {
		for (let endpoint in this.cache) {
			if (endpoint === 'lastSave') {
				continue;
			}
			this.expire(endpoint);
		}
	},

	expireOthers: function() {
		for (let key in localStorage) {
			if (this.options.keyPrefix + this.options.key === key || key.indexOf(this.options.keyPrefix) !== 0) {
				continue;
			}
			let data = JSON.parse(localStorage.getItem(key) || '{}');
			if (data.lastSave + this.getCacheTime('global') < Date.now()) {
				localStorage.removeItem(key);
			}
		}
	},

	getCached: function (endpoint) {
		this.expire(endpoint);
		return this.cache[endpoint] && this.cache[endpoint][1];
	},

	setCache: function (value, endpoint) {
		this.cache[endpoint] = [Date.now(), value];
		this.save();
	},

	getPending: function (endpoint) {
		return this.pending[endpoint];
	},

	setPending: function (endpoint, promise) {
		if (promise === undefined) {
			delete this.pending[endpoint];
		} else {
			this.pending[endpoint] = promise;
		}
	},

	get: function (endpoint, params) {
		var querystring = urlify(params);
		var cached = this.getCached(endpoint + querystring);
		if (cached) {
			return Promise.resolve(cached);
		}

		var pending = this.getPending(endpoint + querystring);
		if (pending) {
			return pending;
		}

		var promise = getJson(this.options.rootUrl + endpoint + querystring + '&access_token=' + this.options.key);
		this.setPending(endpoint + querystring, promise);
		return promise.then(data => {
			this.setCache(data, endpoint + querystring);
			this.setPending(endpoint + querystring);
			return data;
		});
	},
};
