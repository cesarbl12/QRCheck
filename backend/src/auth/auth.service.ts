import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const expiresIn =
      user.role === Role.ADMIN
        ? this.config.get<string>('JWT_EXPIRES_IN_ADMIN')
        : this.config.get<string>('JWT_EXPIRES_IN_SCANNER');

    const accessToken = await this.jwt.signAsync(
      {
        sub: user.id,
        username: user.username,
        role: user.role,
        tokenVersion: user.tokenVersion,
      },
      { expiresIn: expiresIn as `${number}${'s' | 'm' | 'h' | 'd'}` },
    );

    return { accessToken, username: user.username, role: user.role };
  }
}
