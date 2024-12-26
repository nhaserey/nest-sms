import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UserDto {
  id?: string;
  name?: string;
  email?: string;
  password?: string;
}

export class ActivationDto {
  @ApiProperty({ description: 'ActivationToken' })
  @IsNotEmpty({ message: 'ActivationToken is required' })
  activationToken: string;
  @ApiProperty({ description: 'ActivationCode' })
  @IsNotEmpty({ message: 'Activation Code is required' })
  activationCode: string;
}
