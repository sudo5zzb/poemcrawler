const logger = require('./helper/logger');
const superagent = require('superagent');
const cheerio = require('cheerio');
const async = require('async');
const eventproxy = require('eventproxy');
const config = require('./config');
const process = require('process');
const fs = require('fs');
const ep = new eventproxy();

process.on('unhandledRejection', (err) => {
	logger.error(err)
	process.exit(1)
})

const main = async () => {
	let pageUrls = [];
	//诗类地址
	for (let i = 1; i <= 1000; i++) {
		pageUrls.push('https://www.gushiwen.org/shiwen/default_4A111111111111A' + i + '.aspx');
	}
	//词类地址
	for (let i = 1; i <= 1000; i++) {
		pageUrls.push('https://www.gushiwen.org/shiwen/default_4A222222222222A' + i + '.aspx');
	}
	//曲类地址
	for (let i = 1; i <= 145; i++) {
		pageUrls.push('https://www.gushiwen.org/shiwen/default_4A333333333333A' + i + '.aspx');
	}
	//文言文类地址
	for (let i = 1; i <= 60; i++) {
		pageUrls.push('https://www.gushiwen.org/shiwen/default_4A444444444444A' + i + '.aspx');
	}
	async.mapLimit(pageUrls, config.request_parallel_size, (url, callback) => {
		fetchPageDom(url).then($ => {
			let poemUrls = [];

			$('.main3 .left .sons').each((idx, element) => {
				let poemUrl = $(element).find('.cont p').first().find('a').attr('href');
				poemUrls.push(poemUrl);
			})
			ep.emit('crawlPoemUrls', poemUrls);
			logger.info('fetch poemUrls size:' + poemUrls.length + ' for url:' + url);
			let mes = 'url:' + url + ' callback.';
			logger.info(mes);
			callback(null, mes);
		});
	});

	ep.after('crawlPoemUrls', pageUrls.length, async poemUrlArrays => {
		logger.info('poemUrls crawled finished. poemUrlArrays size:' + poemUrlArrays.length);
		let poemUrls = new Set();
		poemUrlArrays.forEach(poemUrlArray => {
			poemUrlArray.forEach(poemUrl => {
				poemUrls.add(poemUrl);
			})
		});
		logger.info('poemUrls size:' + poemUrls.size);
		async.mapLimit(poemUrls, config.request_parallel_size, (url, callback) => {
			fetchPageDom(url).then($ => {
				let 

				let $left = $('.main3 .left');
				let $cont = $left.find('.sons').first().find('.cont');
				let title = $cont.find('h1').text().trim();
				let $source = $cont.find('.source');
				let dynasty = $source.find('a').eq(0).text().trim();
				let author = $source.find('a').eq(1).text().trim();
				let content = $cont.find('.contson').text().trim();
				let tags=[];
				$left.find('.sons').first().find('.tag a').each((idx,element)=>{
					tags.push($(element).text());
				});
				console.log(title);
				console.log(title,dynasty,author);
				console.log(content);
				console.log(tags);
				
				$left.find('div [style="height:30px; font-weight:bold; font-size:16px; margin-bottom:10px; clear:both;"]').each((idx, element) => {
					let $div = $(element);
					let title = $div.find('h2 span').text();
					let content = $div.siblings('p').text();
					if(title=='译文及注释'){

					}
					console.log(title);
					console.log(content);
				});
				callback(null, 'url:' + url + ' callback.');
			});
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