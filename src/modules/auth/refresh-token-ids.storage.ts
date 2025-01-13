import { Injectable, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RefreshTokenIdsStorage
  implements OnApplicationBootstrap, OnApplicationShutdown {
  constructor(
    private readonly config: ConfigService,
  ) {}

  private redisClient: Redis;

  onApplicationBootstrap() {
    this.redisClient = new Redis({
      host: this.config.get('REDIS_HOST') ,
      port: this.config.get<number>('REDIS_PORT'),
    });
  }

  onApplicationShutdown(signal?: string) {
    return this.redisClient.quit();
  }

  async insert(userId: string, token: string) {
    await this.redisClient.set(this.getKey(userId), token);
  }

  async validate(userId: string, tokenId: string) {
    const storedTokenId = await this.redisClient.get(this.getKey(userId));
    if (storedTokenId !== tokenId) {
      throw new Error('Invalid refresh token');
    }
    return storedTokenId === tokenId;
  }

  async invalidate(userId: string) : Promise<void> {
    await this.redisClient.del(this.getKey(userId));
  }

  private getKey(userId: string) : string {
    return  `user-${userId}`;
  }
}

export class InvalidRefreshTokenException extends Error {
}