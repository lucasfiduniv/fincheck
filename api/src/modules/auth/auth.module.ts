import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'

import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { env } from '../../shared/config/env'
import { MailModule } from '../mail/mail.module'
import { SigninUseCase } from './use-cases/signin.use-case'
import { SignupUseCase } from './use-cases/signup.use-case'
import { ForgetPasswordUseCase } from './use-cases/forget-password.use-case'
import { ResetPasswordUseCase } from './use-cases/reset-password.use-case'
import { AuthTokensService } from './services/auth-tokens.service'
import { AuthRepository } from './repositories/auth.repository'

@Module({
  imports: [
    JwtModule.register({
      global: true,
      signOptions: { expiresIn: '7d' },
      secret: env.jwtSecret,
    }),
    MailModule
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthRepository,
    AuthTokensService,
    SigninUseCase,
    SignupUseCase,
    ForgetPasswordUseCase,
    ResetPasswordUseCase,
  ],
})
export class AuthModule {}
