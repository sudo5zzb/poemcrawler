const logger = require('./helper/logger');
const superagent = require('superagent');
const async = require('async');
const eventproxy = require('eventproxy');
const config = require('./config');
const ep = new eventproxy();

const main = async () => {
	let pageUrls = [];
	for (let i = 1; i <= 4; i++) {
		pageUrls.push('https://www.gushiwen.org/shiwen/default_0AA' + i + '.aspx');
	}
	async.mapLimit(pageUrls, 2, (url, callback) => {
		console.log(callback);
		let mes = 'url:' + url + ' callback.';
		setTimeout(()=>{
			console.log(mes)
			callback(null, mes);
		},1000)
	});

	ep.after('crawlPoemUrls', 1000, async poemUrlArrays => {
		logger.log('poemUrls crawled finished. poemUrlArrays size:' + poemUrlArrays.length);
	});

	

}


main();

console.log(111);