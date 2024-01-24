import winston from 'winston';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  // defaultMeta: { service: 'user-service' },
  transports: [
    new winston.transports.File({ filename: '.bubo/logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: '.bubo/logs/info.log', level: 'info' }),
    new winston.transports.File({ filename: '.bubo/logs/debug.log', level: 'debug' }),
    new winston.transports.File({ filename: '.bubo/logs/combined.log' })
  ]
});

export const devLogging = () => {
  // logger.add(new winston.transports.File({
  //   filename: '.bubo/logs/info.log',
  //   level: 'info'
  // }));
  // logger.add(new winston.transports.File({
  //   filename: '.bubo/logs/debug.log',
  //   level: 'debug'
  // }));
  // logger.add(new winston.transports.File({ filename: '.bubo/logs/combined.log' }));
  // logger.add(new winston.transports.Console({
  //   format: winston.format.simple()
  // }));
};
// export const loggerJson = (level, message) => {
//   return logger.log({
//     level,
//     message: JSON.stringify(message)
//   });
// };

export const axiosResponseError = (level, error) => {
  const message = `❌ - Axios Response ${error.status} 
  url: ${error.config.url}
  method: ${error.config.method}
  headers : ${error.config.headers}
  body : ${error.config.body}
  message : ${error.error?.data?.message}
  `;
  return logger.log(level, message);
};
