import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common'
import { ForgetPasswordDto } from '../dto/forget-password-dto'
import { MailService } from '../../mail/mail.service'
import { AuthTokensService } from '../services/auth-tokens.service'
import { AuthRepository } from '../repositories/auth.repository'

@Injectable()
export class ForgetPasswordUseCase {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly mailService: MailService,
    private readonly authTokensService: AuthTokensService,
  ) {}

  async execute(forgetPasswordDto: ForgetPasswordDto) {
    const { email } = forgetPasswordDto

    const user = await this.authRepository.findByEmail(email)

    if (!user) {
      throw new UnauthorizedException('Invalid email.')
    }

    const resetToken = await this.authTokensService.generateResetPasswordToken(user.id)

    try {
      await this.mailService.send({
        to: email,
        subject: 'Recuperação de senha - Fincheck',
        msg: resetToken,
        isRecoverPass: true,
      })
    } catch {
      throw new ServiceUnavailableException('Error during email send.')
    }
  }
}
