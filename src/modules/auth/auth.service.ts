import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { LoggerService } from '../common/middleware/logger.service';
import { PrismaService } from '../prisma/prisma.service';
import { HashingService } from './hashing/hashing.service';
import { JwtService, JwtVerifyOptions } from '@nestjs/jwt';
import { SignUpDto } from './dto/sign-up.dto';
import { ConfigService } from '@nestjs/config';
import { ActivationDto, UserDto } from './dto/user.dto';
import { MailService } from '../mail/mail.service';
import { I18nContext } from 'nestjs-i18n';
import { SignInDto } from './dto/sign-in.dto';
import { UsersService } from '../users/users.service';
import { TokenSender } from '../utils/token/send.token';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { InvalidRefreshTokenException, RefreshTokenIdsStorage } from './refresh-token-ids.storage';
import { authenticator } from 'otplib';

@Injectable()
export class AuthService {
  private readonly  logger = new LoggerService(AuthService.name);

  constructor(
    private readonly  prisma: PrismaService,
    private readonly jwService: JwtService,
    private readonly config: ConfigService,
    private readonly mailService: MailService,
    private readonly userService: UsersService,
    private readonly hashing: HashingService,
    private readonly refreshTokenStorage: RefreshTokenIdsStorage,
  ){}

  async  singUp(signUpDto: SignUpDto,i18n: I18nContext) {
    try {
      // check if user already exists
      const existingUser = await  this.prisma.user.findUnique({
        where: { email: signUpDto.email },
      })
      if (existingUser) {
        this.logger.log(
          `SignUp failed: user with email ${signUpDto.email} already exists`,
        );
        throw new BadRequestException(i18n.t('error.user_already_existed'));
      }
      // encrypt password
      const hashedPassword = await this.hashing.hash(signUpDto.password);
      const user = {
        ...signUpDto,
        password: hashedPassword,
      }
      const activationToken = await this.createActivationToken(user);
      const activationCode = activationToken.activationCode;
      const activation_token = activationToken.token;
      // send activation email
      await this.mailService.sendMailVerification(signUpDto.email, activation_token, activationCode);
      return {
        message: i18n.t('event.register_success'),
        activation_token,
        activationCode
      };
    }catch (error) {
      this.logger.error(error.message);
      throw new Error('Error creating user');
    }
  }
  async activateAccount(activationDto: ActivationDto, i18n: I18nContext) {
    const { activationToken, activationCode } = activationDto;
    const  newUser: {user: UserDto, activationCode: string} = this.jwService.verify(
      activationToken,
      {
        secret: this.config.get<string>('ACTIVATION_SECRET')
      } as JwtVerifyOptions
    ) as {user: UserDto, activationCode: string};
    if (newUser.activationCode !== activationCode) {
      throw new BadRequestException(i18n.t('error.invalid_code'));
    }
    const {name, email, password} = newUser.user;
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    })
    if (existingUser) throw new ConflictException('User already exists');
    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        password,
      },
    })
    return { user  };
  }
  // create activation token
  async createActivationToken(user: UserDto) {
    const activationCode = Math.floor(100000 + Math.random() * 9000).toString();
    const token = this.jwService.sign(
      { user, activationCode },
      {
        secret: this.config.get<string>('ACTIVATION_SECRET'),
        expiresIn: this.config.get<string | number>('JWT_EXPIRATION_TIME'),
      },
    )
    return { activationCode, token };
  }
  async signIn(loginDto: SignInDto, i18n: I18nContext,) {
    const { email, password, code } = loginDto;
    // validate user
    const user = await this.validateUser(email, i18n);
    // Check password
    const isPasswordValid = await this.hashing.compare(
      password,
      user.password,
    );
    if (!isPasswordValid) {
      this.logger.error(
        `Login failed: Invalid password for user ${email}`,
      );
      throw new BadRequestException(i18n.t('error.invalid_credential'));
    }
    if(user && (await this.hashing.compare(password, user.password))) {
      const tokenSender = new TokenSender(this.config, this.jwService, this.refreshTokenStorage);
      if(user.isTwoFactorEnabled) {
        const isValid = this.verifyTwoFactorCode(
          code,
          user.twoFactorSecret,
        )
        if (!isValid) {
          throw new UnauthorizedException('Invalid 2FA code');
        }
      }
      const tokens = await tokenSender.generateTokens(user.id);
      return {
        message: i18n.t('event.login_success'),
        ...tokens,
      }
    } else {
      return {
        accessToken: null,
        refreshToken: null,
        error: {
          message: i18n.t('error.invalid_credential'),
        }
      }
    }
  }
  async logOut(userId: string) {
    return await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshToken: null,
      },
    });
  }
  async refreshToken(refreshToken:  RefreshTokenDto) {
    try {
      const tokenSender = new TokenSender(this.config, this.jwService, this.refreshTokenStorage);
      const {userId,refreshTokenId} = await tokenSender.refreshToken(refreshToken);
      const  user = await this.prisma.user.findUnique({
        where: { id: userId },
      })
      this.logger.log(`User ${user} has refreshed token`);
      const isValid =  this.refreshTokenStorage.validate(
        user.id,
        refreshTokenId
      );
      if (!isValid) {
        await this.refreshTokenStorage.invalidate(user.id);
        throw new UnauthorizedException('Access denied');
      }
      return tokenSender.generateTokens(user.id);
    } catch (e) {
      if (e instanceof  InvalidRefreshTokenException) {
        throw new UnauthorizedException('Access denied');
      }
      throw new UnauthorizedException();
    }
  }
  async generatedTwoFactorSecret(email: string) {
    const secret = authenticator.generateSecret();
    const appName = this.config.getOrThrow('TFA_APP_NAME');
    const uri = authenticator.keyuri(email, appName, secret);
    return {
      secret,
      uri
    };
  }
  verifyTwoFactorCode(email: string, secret: string) {
    return authenticator.verify({
      token: secret,
      secret
    });
  }
  async enableTwoFactorForUser(email: string, secret: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorSecret: secret,
        isTwoFactorEnabled: true,
      },
    });
  }
  // validate user
  async validateUser(email: string, i18n: I18nContext) {
    const user = await this.userService.findEmail(email, i18n);
    if (!user) {
      throw new BadRequestException(i18n.t('error.user_already_existed'));
    }
    return user;
  }
}
