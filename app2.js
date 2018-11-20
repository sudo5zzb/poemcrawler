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
	let poemUrls = await getPoemUrls();
	let titleSet = new Set();
	async.mapLimit(poemUrls, config.request_parallel_size, (url, callback) => {
		fetchPageDom(url).then($ => {
			let $left = $('.main3 .left');
			let $cont = $left.find('.sons').first().find('.cont');
			let title = $cont.find('h1').text().trim();
			let $source = $cont.find('.source');
			let dynasty = $source.find('a').eq(0).text().trim();
			let author = $source.find('a').eq(1).text().trim();
			let content = $cont.find('.contson').text().trim();
			console.log(title);
			// console.log(title,dynasty,author);
			// // console.log(content);
			// $left.find('.contyishang').each((idx,element)=>{
			// 	$contyishang=$(element);
			// 	let title=$contyishang.find('div').eq(1).find('h2 span').text();
			// 	let content=$contyishang.find('p').text();
			// 	console.log(title);
			// 	// console.log(title,content);
			// });
			$left.find('div [style="height:30px; font-weight:bold; font-size:16px; margin-bottom:10px; clear:both;"]').each((idx, element) => {
				let $div = $(element);
				let title = $div.find('h2 span').text();
				let content = $div.siblings('p').text();
				console.log(title);
				// console.log(content);
				titleSet.add(title);
				// console.log(titleSet);

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


const getPoemUrls = async () => {
	logger.info('start to crawl poemUrls');
	let startUrl = 'https://www.gushiwen.org/shiwen/';
	let $ = await fetchPageDom(startUrl);
	let typeUrls = [];
	$('.right .sons').first().find('.cont a').each((idx, element) => {
		typeUrls.push($(element).attr('href'));
	})
	logger.info('typeUrls size:' + typeUrls.length);
	let poemUrls = new Set();
	for (let typeurl of typeUrls) {
		let $ = await fetchPageDom(typeurl);
		$('.left .typecont span a').each((idx, element) => {
			poemUrls.add($(element).attr('href'));
		})
	}
	logger.info('poemUrls fetched size:' + poemUrls.size);
	return poemUrls;
}



// main();

getPoemUrls();