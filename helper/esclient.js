const es = require('elasticsearch');
const config = require(_dirname + '/config')
let client = es.Client({
	host: config.es_url;
});
module.exports = client;