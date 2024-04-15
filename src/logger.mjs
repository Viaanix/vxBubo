import winston from 'winston';
// import { colorize } from './utils.mjs';

export const logger = winston.createLogger({
  // level: 'info',
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
  console.debug('devLogging');
  // console.log(colorize('info', 'devLogging'));
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
