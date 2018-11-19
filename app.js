const logger = require('./helper/logger');
const superagent = require('superagent');
const cheerio = require('cheerio');
const async = require('async');
const eventproxy = require('eventproxy');
const config = require('./config');
const process = require('process');
const ep = new eventproxy();

process.on('unhandledRejection', (err) => {
	logger.error(err)
	process.exit(1)
})

const main = async () => {
	let pageUrls = [];
	for (let i = 1; i <= 4; i++) {
		pageUrls.push('https://www.gushiwen.org/shiwen/default_0AA' + i + '.aspx');
	}
	async.mapLimit(pageUrls, config.request_parallel_size, (url, callback) => {
		fetchPageDom(url).then($ => {
			let poemUrls = [];
			if ($) {
				$('.main3 .left .sons').each((idx, element) => {
					let poemUrl = $(element).find('.cont p').first().find('a').attr('href');
					poemUrls.push(poemUrl);
				})
				ep.emit('crawlPoemUrls', poemUrls);
			}
			logger.info('fetch poemUrls size:' + poemUrls.length + ' for url:' + url);
			let mes = 'url:' + url + ' callback.';
			logger.info(mes);
			callback(null, mes);
		});
	});

	ep.after('crawlPoemUrls', 4, async poemUrlArrays => {
		logger.info('poemUrls crawled finished. poemUrlArrays size:' + poemUrlArrays.length);
		let poemUrls = new Set();
		poemUrlArrays.forEach(poemUrlArray => {
			poemUrlArray.forEach(poemUrl => {
				poemUrls.add(poemUrl);
			})
		});
		logger.info('poemUrls size:' + poemUrls.size);
		async.mapLimit(poemUrls,config.request_parallel_size,(url,callback)=>{
			let $=await fetchPageDom(url);
			if($){
				
			}

		});
	});



}

const fetchPageDom = (url) => {
	return new Promise((resolve, reject) => {
		logger.info('start to crawl url:' + url);
		let $ = undefined;
		setTimeout(() => {
			superagent.get(url).then(result => {
				if (!result || !result.text) {
					logger.error('content invalid for url:' + url);
				} else {
					$ = cheerio.load(result.text);
				}
				resolve($);
			});
		}, config.request_interval_mills);
	});
}



main();