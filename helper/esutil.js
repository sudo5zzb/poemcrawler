const es = require('elasticsearch');
const config = require('../config')

const getClient = () => {
	return es.Client({
		host: config.es_url
	});
}

const esclient = getClient();

const insertAPoem = async (poem) => {
	if (poem) {
		await esclient.create({
			index: config.es_index,
			type: config.es_type,
			body: poem
		});
	}
}

//保证es索引初始化
const esIndexInit = async () => {
	let es_index = config.es_index;
	let es_type = config.es_type;
	let esclient = getClient();
	let exists = await esclient.indices.existsType({
		index: es_index,
		type: es_type
	});
	if (!exists) {
		await esclient.indices.create({
			index: config.es_index,
			type: config.es_type,
			body: {
				es_type: {
					properties: {
						id: {
							type: 'keyword'
						},
						title: {
							type: 'keyword'
						},
						author: {
							type: 'keyword'
						},
						dynasty: {
							type: 'keyword'
						},
						content: {
							type: 'text',
							analyzer: 'ik_max_word',
							search_analyzer: 'ik_smart'
						},
						tags: {
							type: 'text',
							analyzer: 'ik_max_word',
							search_analyzer: 'ik_smart'
						},
						fanyi: {
							type: 'text',
							analyzer: 'ik_max_word',
							search_analyzer: 'ik_smart'
						},
						zhushi: {
							type: 'text',
							analyzer: 'ik_max_word',
							search_analyzer: 'ik_smart'
						},
						shangxi: {
							type: 'text',
							analyzer: 'ik_max_word',
							search_analyzer: 'ik_smart'
						},

					}
				}
			}
		});
	}
}

exports.getClient = getClient;
exports.esIndexInit = esIndexInit;
exports.insertAPoem = insertAPoem;