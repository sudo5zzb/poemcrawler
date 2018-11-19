const winston = require('winston');
require('winston-daily-rotate-file')
const config=require('../config');

// 错误信息日志
const ERROR_LOG_NAME = './logs/error.log';
// 所有运行日志
const APP_LOG_NAME = './logs/app-%DATE%.log'
// 保存天数
const SAVE_DAYS = '14d'

// 格式化输出内容
const formatter = winston.format.combine(
  winston.format.json(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(info => {
    // 输出格式
    const showInfo = { time: info.timestamp, pid: process.pid, level: info.level, message: info.message};
    return JSON.stringify(showInfo)
  })
)

const logger = winston.createLogger({
  level:config.log_level,
  format: formatter,
  transports: [
    // 'error'级别的日志处理
    new winston.transports.File({ 
      level: 'error',
      filename: ERROR_LOG_NAME
    }),
    // '所有的日志处理, maxFiles是回滚时间，超时会删除旧文件，如果不设置，则不会删除'
    new (winston.transports.DailyRotateFile)({
      filename: APP_LOG_NAME,
      zippedArchive: true,
      maxFiles: SAVE_DAYS
    }),
    // 控制台输出
    new winston.transports.Console({})
  ]
});

module.exports = logger;