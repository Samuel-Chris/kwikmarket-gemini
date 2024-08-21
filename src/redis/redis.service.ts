import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService {
  private client: Redis;

  constructor() {
    // this.client = new Redis();
  }

  // async get(key: string) {
  //   return this.client.get(key);
  // }

  // async set(key: string, value: string) {
  //   return this.client.set(key, value);
  // }

  // async queueMessage(message: string, threadID: string) {
  //   console.log('Queueing message:', message);

  //   // add message to redis queue
  //   this.client.rpush(`chat:${threadID}`, JSON.stringify({ message }));
  // }
}
