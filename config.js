module.exports = {
	//elasticsearch 连接url
	es_url: 'http://127.0.0.1:9200',
	//数据要插入的index（自动构建，小写）
	es_index: 'poem',
	//数据要插入的type（自动构建）
	es_type: 'poem',
	log_level: 'info',
	//请求发送之间的时间间隔
	request_interval_mills: 100,
	//请求发送并发量
	request_parallel_size: 10
}