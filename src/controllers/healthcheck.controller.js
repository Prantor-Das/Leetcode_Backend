import { db } from '../libs/db.js';
import redisClient from '../libs/redisClient.js';

async function checkDatabase() {
  try {
    await db.user.findFirst(); // Simple health check query
    return { status: 'healthy' };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}

async function checkRedis() {
  try {
    const ping = await redisClient.ping();
    return ping === 'PONG' ? { status: 'healthy' } : { status: 'unhealthy' };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}

export const healthCheck = async (req, res) => {
  const dbStatus = await checkDatabase();
  const redisStatus = await checkRedis();

  const isHealthy = dbStatus.status === 'healthy' && redisStatus.status === 'healthy';

  res.status(isHealthy ? 200 : 500).json({
    status: isHealthy ? 'UP' : 'DOWN',
    services: {
      database: dbStatus,
      redis: redisStatus
    },
    timestamp: new Date().toISOString()
  });
};
