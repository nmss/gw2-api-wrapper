/* global Promise, $ */
'use strict';

function Api(options) {
	this.keyPrefix = 'gw2-api-';
	this.key = options.key;
	this.rootUrl = 'https://api.guildwars2.com/v2/';
	this.cache = JSON.parse(localStorage.getItem(this.keyPrefix + this.key) || '{}');
	this.pending = {};
	this.saveDelay = 1000;
	this.cacheTime = 60 * 60 * 1000;

	this.get('tokeninfo').then(tokeninfo => {
		this.permissions = tokeninfo.permissions;
	}, () => {
		this.permissions = [];
	});

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
			localStorage.setItem(this.keyPrefix + this.key, JSON.stringify(this.cache));
		}, this.saveDelay);
	},

	isEndpointAllowed: function (endpoint) {
		if (!this.permissions) {
			return true;
		}
		var endpointRoot = endpoint.split('/')[0];
		return this.permissions.indexOf(endpointRoot) !== -1;
	},

	expire: function (endpoint) {
		if (this.cache[endpoint]) {
			let expireDate = this.cache[endpoint][0] + this.cacheTime;
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
			if (this.keyPrefix + this.key === key || key.indexOf(this.keyPrefix) !== 0) {
				continue;
			}
			let data = JSON.parse(localStorage.getItem(key) || '{}');
			if (data.lastSave + this.cacheTime < Date.now()) {
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

	get: function (endpoint) {
		var cached = this.getCached(endpoint);
		if (cached) {
			return Promise.resolve(cached);
		}

		var pending = this.getPending(endpoint);
		if (pending) {
			return pending;
		}

		if (!this.isEndpointAllowed(endpoint)) {
			return Promise.reject('Missing permissions for this endpoint');
		}

		var promise = Promise.resolve().then(() => {
			return $.getJSON(this.rootUrl + endpoint + '?access_token=' + this.key);
		});
		this.setPending(endpoint, promise);
		return promise.then(data => {
			this.setCache(data, endpoint);
			this.setPending(endpoint);
			return data;
		}).catch(jqXhr => {
			if (jqXhr.status === 403) {
				console.error('Clé d\'API invalide');
				throw jqXhr;
			}
		});
	},

	getAccount: function () { return this.get('account'); },
	getBank: function () { return this.get('account/bank'); },
	getDyes: function () { return this.get('account/dyes'); },
	getMaterials: function () { return this.get('account/materials'); },
	getSkins: function () { return this.get('account/skins'); },
	getWallet: function () { return this.get('account/wallet'); },
	getCharacters: function () { return this.get('characters'); },
	getTransactions: function () { return this.get('commerce/transactions'); },
	getPvpStats: function () { return this.get('pvp/stats'); },
	getPvpGames: function () { return this.get('pvp/games'); },
	getTokenInfo: function () { return this.get('tokeninfo'); },
};
