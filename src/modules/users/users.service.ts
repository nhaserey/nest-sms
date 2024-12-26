import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { I18nContext } from 'nestjs-i18n';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/middleware/logger.service';

@Injectable()
export class UsersService {
  private readonly logger = new LoggerService(UsersService.name);
  constructor(private prisma: PrismaService) {
  }
  create(createUserDto: CreateUserDto) {
    return 'This action adds a new user';
  }

  findAll() {
    return `This action returns all users`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: String(id),
      },
    });
    if (!user) {
      this.logger.error(`User lookup failed: ID ${id} not found`);
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findEmail(email: string, i18n: I18nContext) {
    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });
    if (!user) {
      this.logger.error(`User lookup failed ${email} not found`);
      throw new NotFoundException(
        i18n.t('error.user_not_found', {
          args: { email },
        }),
      );
    }
    return user;
  }
}
