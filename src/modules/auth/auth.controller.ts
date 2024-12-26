import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiBadRequestResponse, ApiForbiddenResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { I18n, I18nContext } from 'nestjs-i18n';
import { SignUpDto } from './dto/sign-up.dto';
import { ForbiddenDto } from '../common/schema/forbidden.dt';
import { SignInDto } from './dto/sign-in.dto';
import { ActivationDto } from './dto/user.dto';



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
  async SignUp(
    @Body() signUpDto: SignUpDto,
    @I18n() i18n: I18nContext,
  ) {
    return await this.authService.singUp(signUpDto, i18n);
  }

  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ description: 'Login successful' })
  @ApiBadRequestResponse({ description: 'Unsuccessful login' })
  @Post('login')
  async login(@Body() signInDto: SignInDto, @I18n() i18n: I18nContext) {
    return await this.authService.login(signInDto, i18n);
  }

  @ApiOperation({ summary: 'Activate user account' })
  @ApiResponse({ description: 'Account activated' })
  @ApiBadRequestResponse({ description: 'Invalid activation token' })
  @Post('activate')
  async activate(@Body() activationDto: ActivationDto, @I18n() i18n: I18nContext) {
    return await this.authService.activateAccount(activationDto, i18n);
  }
}
