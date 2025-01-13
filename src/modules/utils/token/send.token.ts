import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokenDto } from '../../auth/dto/refresh-token.dto';
import { RefreshTokenIdsStorage } from '../../auth/refresh-token-ids.storage';

export class TokenSender {
  constructor(
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
    private readonly  refreshTokenStorage: RefreshTokenIdsStorage,
  ) {}

  async generateTokens(userId: string) {
    const accessToken = this.jwtService.sign(
      { userId },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRATION_TIME'),
      },
    );

    const refreshToken = this.jwtService.sign(
      { userId },
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRATION_TIME'),
      },
    );
    await this.refreshTokenStorage.insert(userId, refreshToken);
    return { accessToken, refreshToken };
  }

  async refreshToken(refreshToken:  RefreshTokenDto) {
      const { sub: userId, refreshTokenId } = await this.jwtService.verifyAsync<{sub: string; refreshTokenId: string}>(refreshToken.refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
      return {userId, refreshTokenId};
  }
}