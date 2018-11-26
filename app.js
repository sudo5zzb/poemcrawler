const superagent = require('superagent');
const cheerio = require('cheerio');
const async = require('async');
const process = require('process');
const co = require('co');
const fs = require('fs');
const os = require('os');
const logger = require('./helper/logger');
const eventproxy = require('eventproxy');
const config = require('./config');
const poem = require('./beans/poem')
const esutil = require('./helper/esutil');

const ep = new eventproxy();

process.on('unhandledRejection', (err) => {
	logger.error(err)
	process.exit(1)
})


process.on('SIGINT', () => {
	esutil.closeConnections();
})

const main = async () => {
	//初始化索引
	await esutil.esIndexInit();

	let pageUrls = [];
	// 测试
	// for (let i = 1; i <= 200; i++) {
	// 	pageUrls.push('https://www.gushiwen.org/shiwen/default_4A111111111111A' + i + '.aspx');
	// }
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
	let processedPageUrlSize = 0;
	async.mapLimit(pageUrls, config.request_parallel_size, (url, callback) => {
		fetchPageDom(url).then($ => {
			let poemUrls = [];
			if ($) {
				$('.main3 .left .sons').each((idx, element) => {
					let poemUrl = $(element).find('.cont p').first().find('a').attr('href');
					poemUrls.push(poemUrl);
				})
			}
			ep.emit('crawlPoemUrls', poemUrls);
			logger.info('fetch poemUrls size:' + poemUrls.length + ' for url:' + url);
			processedPageUrlSize++;
			let mes = 'fetch pageUrls >> url:' + url + ' callback. progress:' + processedPageUrlSize + '/' + pageUrls.length;
			logger.info(mes);
			callback(null, mes);
		});
	});

	let processedPoemUrlSize = 0;
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
			let apoem;
			fetchPageDom(url).then($ => {
				if ($) {
					let id = url.slice(url.lastIndexOf('_') + 1, url.lastIndexOf('.'));
					let $left = $('.main3 .left');
					let $cont = $left.find('.sons').first().find('.cont');
					let title = $cont.find('h1').text().trim();
					let $source = $cont.find('.source');
					let dynasty = $source.find('a').eq(0).text().trim();
					let author = $source.find('a').eq(1).text().trim();
					let $contson = $cont.find('.contson');
					$contson.find('span[stype]').remove();
					$contson.find('br').replaceWith('$');
					let content;
					if ($contson.find('p').length) {
						let contentArray = [];
						$contson.find('p').each((idx, element) => {
							contentArray.push($(element).text());
						})
						content = contentArray.join('$');
					} else {
						content = $contson.text();
					}
					content = content.replace(/\n/g, '');
					let tags = [];
					$left.find('.sons').first().find('.tag a').each((idx, element) => {
						tags.push($(element).text());
					});
					apoem = new poem(id, title, author, dynasty, content, tags.join());
				}
				ep.emit('poemObjs', apoem);
				processedPoemUrlSize++;
				let mes = 'fetch poemContent >> url:' + url + ' callback. progress:' + processedPoemUrlSize + '/' + poemUrls.size;
				logger.info(mes);
				callback(null, mes);
			});
		});

		//完善古诗内容
		let processedTobeCompletedPoemUrlSize = 0;
		ep.after('poemObjs', poemUrls.size, async poemObjs => {
			logger.info('start to crawle other content.');
			let esclient = esutil.getClient();
			async.mapLimit(poemObjs, config.request_parallel_size, (poem, callback) => {
				if (!poem) {
					processedTobeCompletedPoemUrlSize++;
					let mes = 'fetch poemOtherContent >> id:' + id + ' callback. progress:' + processedTobeCompletedPoemUrlSize + '/' + poemUrls.size;
					logger.info(mes);
					callback(null, mes);
					return;
				}
				id = poem.id;
				let fanyiurl = 'https://so.gushiwen.org/shiwen2017/ajaxshiwencont.aspx?id=' + id + '&value=yi';
				let zhushiurl = 'https://so.gushiwen.org/shiwen2017/ajaxshiwencont.aspx?id=' + id + '&value=zhu';
				let shangxiurl = 'https://so.gushiwen.org/shiwen2017/ajaxshiwencont.aspx?id=' + id + '&value=shang';
				co(fetchPageDomsGenerator([fanyiurl, zhushiurl, shangxiurl])).then(results => {
					//处理翻译内容
					{
						let $ = results[0];
						if ($) {
							let fanyiLines = [];
							$('p span').each((idx, element) => {
								let $span = $(element);
								let fanyiLine = $span.text();
								let yuanwenLine = $span.parent('p').text();
								yuanwenLine = yuanwenLine.replace(fanyiLine, '');
								fanyiLines.push(yuanwenLine + '$' + fanyiLine);
							})
							let fanyi = fanyiLines.join('$$');
							poem.fanyi = fanyi;
						}
					}
					//处理注释内容
					{
						let $ = results[1];
						if ($) {
							let zhushiLines = [];
							$('p').not('[style]').each((idx, element) => {
								let $p = $(element);
								let zhushiLine = $p.find('span').last().text();
								let yuanwenLine = $p.text();
								yuanwenLine = yuanwenLine.replace(zhushiLine, '');
								zhushiLines.push(yuanwenLine + '$' + zhushiLine);
							})
							let zhushi = zhushiLines.join('$$');
							poem.zhushi = zhushi;
						}
					}
					//处理赏析内容
					{
						let $ = results[2];
						if ($) {
							let shangxiLines = [];
							$('div.hr').nextAll('p').not('[style]').each((idx, element) => {
								shangxiLines.push($(element).text());
							})
							let shangxi = shangxiLines.join('$');
							poem.shangxi = shangxi;
						}
					}
					esutil.insertAPoem(poem);
					processedTobeCompletedPoemUrlSize++;
					let mes = 'fetch poemOtherContent >> id:' + id + ' callback. progress:' + processedTobeCompletedPoemUrlSize + '/' + poemUrls.size;
					logger.info(mes);
					callback(null, mes);
				})
			});
		});
	});
}

const fetchPageDomsGenerator = function*(urls) {
	logger.info('start to crawl urls:' + urls);
	let doms = [];
	for (let url of urls) {
		let $ = yield fetchPageDom(url);
		doms.push($);
	}
	return doms;
}

const fetchPageDom = (url) => {
	return new Promise((resolve, reject) => {
		logger.info('start to crawl url:' + url);
		let $;
		setTimeout(() => {
			superagent.get(url).then(result => {
				if (!result || !result.text) {
					logger.error('content invalid for url:' + url);
				} else {
					$ = cheerio.load(result.text);
				}
				resolve($);
			}).catch(err => {
				logger.error(err);
				resolve($);
			});
		}, config.request_interval_mills);
	});
}

main();