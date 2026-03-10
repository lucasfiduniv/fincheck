import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { env } from 'src/shared/config/env'

@Injectable()
export class AuthTokensService {
  constructor(private readonly jwtService: JwtService) {}

  generateAcessToken(userId: string) {
    return this.jwtService.signAsync({ sub: userId })
  }

  generateResetPasswordToken(userId: string) {
    return this.jwtService.signAsync(
      { sub: userId },
      { secret: env.resetPasswordJwtSecret, expiresIn: 300 },
    )
  }
}
