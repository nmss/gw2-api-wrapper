/* global Promise */
function Api(options) {
	this.key = options.key;
	this.rootUrl = 'https://api.guildwars2.com/v2/';
	this.cache = {};
}

Api.prototype = {
	getCached: function (endpoint, key) {
		if (key) {
			return this.cache[endpoint] && this.cache[endpoint][key];
		}
		return this.cache[endpoint];
	},

	setCache: function (value, endpoint, key) {
		if (!key) {
			this.cache[endpoint] = value;
		} else {
			if (!this.cache[endpoint]) {
				this.cache[endpoint] = {};
			}
			this.cache[endpoint][key] = value;
		}
	},

	get: function (endpoint) {
		var cached = this.getCached(endpoint);
		if (cached) {
			return Promise.resolve(cached);
		}
		return Promise.resolve().then(() => {
			return $.getJSON(this.rootUrl + endpoint + '?access_token=' + this.key);
		}).then(data => {
			this.setCache(data, endpoint);
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