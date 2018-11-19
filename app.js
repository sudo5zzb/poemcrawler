const logger = require('./helper/logger');
const superagent = require('superagent');
const cheerio = require('cheerio');
const async = require('async');
const eventproxy = require('eventproxy');
const config = require('./config');
const ep = new eventproxy();

const main = async () => {
	let pageUrls = [];
	for (let i = 1; i <= 1000; i++) {
		pageUrls.push('https://www.gushiwen.org/shiwen/default_0AA' + i + '.aspx');
	}
	async.mapLimit(pageUrls, config.request_parallel_size, (url, callback) => {
		console.log(url);
		fetchPageDom(url).then($ => {
			if ($) {
				let poemUrls = [];
				$('.main3 .left .sons').each((idx, element) => {
					let poemUrl = $(element).find('.cont p').first().find('a').attr('href');
					poemUrls.push(poemUrl);
				})
				ep.emit('crawlPoemUrls', poemUrls);
			}
			logger.info('fetch poemUrls size:' + poemUrls.size + ' for url:' + url);
			setTimeout(() => {
				let mes = 'url:' + url + ' callback.';
				logger.info(mes);
				callback(null, mes);
			}, config.request_interval_mills);
		})
		catch (error => logger.error(error));

	});

	ep.after('crawlPoemUrls', 1000, async poemUrlArrays => {
		logger.log('poemUrls crawled finished. poemUrlArrays size:' + poemUrlArrays.length);
		let poemUrls = new Set();
		poemUrlArrays.forEach(poemUrlArray => {
			poemUrlArray.forEach(poemUrl => {
				poemUrls.add(poemUrl);
			})
		});
		logger.info('poemUrls size:' + poemUrls.size);
		// async.mapLimit(poemUrls,config.request_parallel_size,(url,callback)=>{
		// 	let $=fetchPageDom(url);

		// });
	});



}

const fetchPageDom = async (url) => {
	logger.info('start to crawl url:' + url);
	let $ = undefined;
	await superagent.get(url).then(result => {
		if (!result || !result.text) {
			logger.error('content invalid for url:' + url);
		} else {
			$ = cheerio.load(result.text);
		}
	}).catch(error => {
		logger.error(error);
	});
	return $;
}


main();