import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const client = createClient({
    username: 'default',
    password: process.env.REDIS_PASS,
    socket: {
        host: 'redis-18534.c52.us-east-1-4.ec2.redns.redis-cloud.com',
        port: 18534
    }
});

client.on('error', err => console.log('Redis Client Error', err));

await client.connect();

export default client;