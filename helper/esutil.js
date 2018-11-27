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
		await esclient.index({
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
	let exists = await esclient.indices.existsType({
		index: es_index,
		type: es_type
	});
	if (!exists) {
		try {
			let propertiesObj = {
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
					}
				}

			};
			let mapping = {};
			mapping[es_type] = propertiesObj;
			await esclient.indices.create({
				index: es_index
			});
			await esclient.indices.putMapping({
				index: es_index,
				type: es_type,
				body: mapping
			});
		} catch (err) {
			console.log(err);
		} finally {
			esclient.close();
		}
	}

}

const closeConnections = () => {
	esclient.close();
}

exports.closeConnections = closeConnections;
exports.getClient = getClient;
exports.esIndexInit = esIndexInit;
exports.insertAPoem = insertAPoem;