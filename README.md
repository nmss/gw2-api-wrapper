# gw2-api-wrapper

## Initialize
```javascript
var options = {
	key: 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXXXXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX'
};
var api = new Api(options);
```

## Retrieve data from the api
View full list of supported endpoint on the wiki : [API:Main](https://wiki.guildwars2.com/wiki/API:Main)
```javascript
var endpoint = 'account/banck';
api.get(endpoint).then(function(data) {
	// do something with the data 
})
```

## Error handling
```javascript
api.get(endpoint).catch(function(error) {
	// do something with the error 
})
```
```javascript
api.get(endpoint).then(function(data) {
	// do something with the data
}, function(error) {
	// do something with the error 
})
