const logger = require('./helper/logger');
const superagent = require('superagent');
const cheerio = require('cheerio');
const async = require('async');
const eventproxy = require('eventproxy');
const config = require('./config');
const process = require('process');
const fs = require('fs');
const poem = require('./beans/poem')
const ep = new eventproxy();

process.on('unhandledRejection', (err) => {
	logger.error(err)
	process.exit(1)
})

const main = async () => {
	let pageUrls = [];
	//测试
	for (let i = 1; i <= 1; i++) {
		pageUrls.push('https://www.gushiwen.org/shiwen/default_4A111111111111A' + i + '.aspx');
	}
	// //诗类地址
	// for (let i = 1; i <= 1000; i++) {
	// 	pageUrls.push('https://www.gushiwen.org/shiwen/default_4A111111111111A' + i + '.aspx');
	// }
	// //词类地址
	// for (let i = 1; i <= 1000; i++) {
	// 	pageUrls.push('https://www.gushiwen.org/shiwen/default_4A222222222222A' + i + '.aspx');
	// }
	// //曲类地址
	// for (let i = 1; i <= 145; i++) {
	// 	pageUrls.push('https://www.gushiwen.org/shiwen/default_4A333333333333A' + i + '.aspx');
	// }
	// //文言文类地址
	// for (let i = 1; i <= 60; i++) {
	// 	pageUrls.push('https://www.gushiwen.org/shiwen/default_4A444444444444A' + i + '.aspx');
	// }
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
				let id = url.slice(url.lastIndexOf('_') + 1, url.lastIndexOf('.'));
				let $left = $('.main3 .left');
				let $cont = $left.find('.sons').first().find('.cont');
				let title = $cont.find('h1').text().trim();
				let $source = $cont.find('.source');
				let dynasty = $source.find('a').eq(0).text().trim();
				let author = $source.find('a').eq(1).text().trim();
				let content = $cont.find('.contson').text().trim();
				let tags = [];
				$left.find('.sons').first().find('.tag a').each((idx, element) => {
					tags.push($(element).text());
				});
				let apoem = new poem(id, title, author, dynasty, content, tags.join());
				ep.emit('poemObjs', apoem);
				callback(null, 'url:' + url + ' callback.');
			});
		});

		ep.after('poemObjs', poemUrls.size, async poemObjs => {
			logger.info('start to crawle other content.');
			async.mapLimit(poemObjs, paralSize, (poem, callback) => {
				id = poem.id;
				let fanyiurl = 'https://so.gushiwen.org/shiwen2017/ajaxshiwencont.aspx?id=' + id + '&value=yi';
				let zhushiurl = 'https://so.gushiwen.org/shiwen2017/ajaxshiwencont.aspx?id=' + id + '&value=zhu';
				let shangxiurl = 'https://so.gushiwen.org/shiwen2017/ajaxshiwencont.aspx?id=' + id + '&value=shang';
				fetchPageDoms([fanyiurl, zhushiurl, shangxiurl]).then(results => {
					{
						let $ = results[0];
						if ($) {
							$('span [style="color:#76621c;"]').each((idx, element) => {
								let $span = $(element);
								let fanyiLine = $span.text();
								let yuanwenLine = $span.parent('p').text();
								console.log(fanyiLine, yuanwenLine);

							})
						}
					}


				})
			});
		});
	});



}

const fetchPageDoms = * (urls) => {
	logger.info('start to crawl urls:' + urls);
	for (let url of urls) {
		fetchPageDom(url).then($ => {
			yield $;
		});
	}
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
			}).catch(err => resolve(undefined));
		}, config.request_interval_mills);
	});
}



main();