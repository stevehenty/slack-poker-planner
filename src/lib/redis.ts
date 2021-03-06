import * as redis from 'redis';

import * as logger from './logger';

let client: redis.RedisClient;

export async function init() {
  if (client) {
    logger.warn('Trying to init redis multiple times!');
    return client;
  }

  logger.info(`Creating redis client...`);
  client = redis.createClient();

  await new Promise((resolve, reject) => {
    client.once('ready', resolve);
    client.once('error', reject);
  });

  client.on('error', (err) => {
    logger.error(`[redis] an error occured`, err);
  });

  return client;
}

export function getSingleton() {
  return client;
}
