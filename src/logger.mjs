import winston from 'winston';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  // defaultMeta: { service: 'user-service' },
  transports: [
    new winston.transports.File({ filename: '.bubo/logs/debug.log', level: 'debug' }),
    new winston.transports.File({ filename: '.bubo/logs/error.log', level: 'error', lazy: true }),
    new winston.transports.File({ filename: '.bubo/logs/combined.log' })
  ]
});

// if (process.env.NODE_ENV !== 'production') {
//   logger.add(new winston.transports.Console({
//     format: winston.format.simple()
//   }));
// }

export const loggerJson = (level, message) => {
  return logger.log({
    level,
    message: JSON.stringify(message)
  });
};
