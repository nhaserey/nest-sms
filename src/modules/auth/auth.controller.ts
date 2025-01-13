import { Controller, Get, Post, Body, Patch, Param, Delete, Res, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiBadRequestResponse, ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { I18n, I18nContext } from 'nestjs-i18n';
import { SignUpDto } from './dto/sign-up.dto';
import { ForbiddenDto } from '../common/schema/forbidden.dt';
import { SignInDto } from './dto/sign-in.dto';
import { ActivationDto } from './dto/user.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ActiveUser } from '../common/decorator/active-user.decorator';
import { ActiveUserData } from '../common/interface/active-user-data.interface';
import { Response } from 'express';
import { toFileStream } from 'qrcode';
import { JwtAuthGuard } from '../common/guard/jwt.guard';
import { NoCache } from '../common/decorator/no-cache.decorator';
import RequestWithUser from '../common/interface/request-user.interface';


@Controller('auth')
@ApiTags('Authentication')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Register a user and send mail verification' })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ForbiddenDto })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  @Post('/register')
  async signUp(
    @Body() signUpDto: SignUpDto,
    @I18n() i18n: I18nContext,
  ) {
    return await this.authService.singUp(signUpDto, i18n);
  }

  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ description: 'Login successful' })
  @ApiBadRequestResponse({ description: 'Unsuccessful login' })
  @Post('login')
  async signIn(@Body() signInDto: SignInDto, @I18n() i18n: I18nContext) {
    return await this.authService.signIn(signInDto, i18n);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @NoCache()
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({ description: 'Logout successful' })
  @Post('/logout')
  async logout(@Req() req: RequestWithUser) {
    return await this.authService.logout(req.user.id);
  }


  @ApiOperation({ summary: 'Activate user account' })
  @ApiResponse({ description: 'Account activated' })
  @ApiBadRequestResponse({ description: 'Invalid activation token' })
  @Post('activate')
  async activate(@Body() activationDto: ActivationDto, @I18n() i18n: I18nContext) {
    return await this.authService.activateAccount(activationDto, i18n);
  }

  @ApiOperation({ summary: 'refresh token user account' })
  @ApiResponse({ description: 'refresh toke' })
  @ApiBadRequestResponse({ description: 'Invalid activation token' })
  @Post('refresh-token')
    async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
      return await this.authService.refreshToken(refreshTokenDto);
  }

  @Post('2fa/generate')
  async generate2faSecret(
    @ActiveUser() user: ActiveUserData,
    @Res() res: Response,
  ) {
    const { secret, uri } = await this.authService.generatedTwoFactorSecret(user.email);
    await this.authService.enableTwoFactorForUser(user.email, secret);
    res.type('png');
    return toFileStream(res, uri);
  }
}
