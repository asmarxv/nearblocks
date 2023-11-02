import { logger } from 'nb-logger';

import config from '#config';
import knex from '#libs/knex';
import { redisClient } from '#libs/redis';
import sentry from '#libs/sentry';
import { syncGenesis } from '#services/genesis';
import { syncData } from '#services/stream';

(async () => {
  try {
    logger.info({ network: config.network }, 'initializing base indexer...');
    await redisClient.connect();
    logger.info('syncing genesis data...');
    await syncGenesis();
    logger.info('syncing blockchain data...');
    await syncData();
  } catch (error) {
    logger.error('aborting...');
    logger.error(error);
    sentry.captureException(error);
    process.exit();
  }
})();

const onSignal = async (signal: number | string) => {
  try {
    await knex.destroy();
    await redisClient.quit();
    await sentry.close(1_000);
  } catch (error) {
    logger.error(error);
  }

  process.kill(process.pid, signal);
};

process.once('SIGINT', onSignal);
process.once('SIGTERM', onSignal);
