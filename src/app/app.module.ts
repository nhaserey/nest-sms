import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MailModule } from '../modules/mail/mail.module';
import { UsersModule } from '../modules/users/users.module';
import { AuthModule } from '../modules/auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as path from 'path';
import { AcceptLanguageResolver, I18nJsonLoader, I18nModule, QueryResolver } from 'nestjs-i18n';
import { RolesGuard } from 'src/modules/common/guard/roles.guard';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtAuthGuard } from 'src/modules/common/guard/jwt.guard';
import { CacheModule } from '@nestjs/cache-manager';
import { redisConfig } from 'src/modules/utils/config/config';
import { NoCacheInterceptor } from 'src/modules/common/interceptor/no-cache.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    I18nModule.forRootAsync({
      useFactory: () => ({
        fallbackLanguage: 'kh',
        loader: I18nJsonLoader,
        loaderOptions: {
          path: path.join(__dirname, '../i18n/'),
          watch: true,
        },
        typesOutputPath: path.join(
          __dirname,
          '../common/generated/i18n.generated.ts',
        ),
      }),
      resolvers: [
        { use: QueryResolver, options: ['lang'] },
        AcceptLanguageResolver,
      ],
    }),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: redisConfig,
      isGlobal: true,
    }),
    AuthModule,
    UsersModule,
    MailModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: NoCacheInterceptor,
    },
  ],
})
export class AppModule {}