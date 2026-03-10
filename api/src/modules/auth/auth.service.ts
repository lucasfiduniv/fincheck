import {
  Injectable,
} from '@nestjs/common'
import { SigninDto } from './dto/signin-dto'
import { SignupDto } from './dto/signup-dto'
import { ForgetPasswordDto } from './dto/forget-password-dto'
import { ResetPasswordDto } from './dto/reset-password-dto'
import { SigninUseCase } from './use-cases/signin.use-case'
import { SignupUseCase } from './use-cases/signup.use-case'
import { ForgetPasswordUseCase } from './use-cases/forget-password.use-case'
import { ResetPasswordUseCase } from './use-cases/reset-password.use-case'

@Injectable()
export class AuthService {
  constructor(
    private readonly signinUseCase: SigninUseCase,
    private readonly signupUseCase: SignupUseCase,
    private readonly forgetPasswordUseCase: ForgetPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
  ) {}

  async signin(signinDto: SigninDto) {
    return this.signinUseCase.execute(signinDto)
  }

  async signup(signupDto: SignupDto) {
    return this.signupUseCase.execute(signupDto)
  }

  async forgetPassword(forgetPasswordDto: ForgetPasswordDto) {
    return this.forgetPasswordUseCase.execute(forgetPasswordDto)
  }

  async resetPassword(userId: string, resetPasswordDto: ResetPasswordDto) {
    return this.resetPasswordUseCase.execute(userId, resetPasswordDto)
  }
}
