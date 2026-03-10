import { Injectable, UnauthorizedException } from '@nestjs/common'
import { compare } from 'bcryptjs'
import { SigninDto } from '../dto/signin-dto'
import { AuthTokensService } from '../services/auth-tokens.service'
import { AuthRepository } from '../repositories/auth.repository'

@Injectable()
export class SigninUseCase {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly authTokensService: AuthTokensService,
  ) {}

  async execute(signinDto: SigninDto) {
    const { email, password } = signinDto

    const user = await this.authRepository.findByEmail(email)

    if (!user) {
      throw new UnauthorizedException('Invalid credentials.')
    }

    const isPasswordValid = await compare(password, user.password)

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials.')
    }

    const acessToken = await this.authTokensService.generateAcessToken(user.id)

    return { acessToken }
  }
}
