import { ConflictException, Injectable } from '@nestjs/common'
import { hash } from 'bcryptjs'
import { SignupDto } from '../dto/signup-dto'
import { AuthTokensService } from '../services/auth-tokens.service'
import { AuthRepository } from '../repositories/auth.repository'

@Injectable()
export class SignupUseCase {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly authTokensService: AuthTokensService,
  ) {}

  async execute(signupDto: SignupDto) {
    const { name, email, password } = signupDto

    const emailTaken = await this.authRepository.isEmailTaken(email)

    if (emailTaken) {
      throw new ConflictException('This email is already in use.')
    }

    const hashedPassword = await hash(password, 12)

    const user = await this.authRepository.createUserWithDefaultCategories({
      name,
      email,
      password: hashedPassword,
    })

    const acessToken = await this.authTokensService.generateAcessToken(user.id)

    return { acessToken }
  }
}
