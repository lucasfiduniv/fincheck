import { Injectable } from '@nestjs/common'
import { hash } from 'bcryptjs'
import { ResetPasswordDto } from '../dto/reset-password-dto'
import { AuthRepository } from '../repositories/auth.repository'

@Injectable()
export class ResetPasswordUseCase {
  constructor(private readonly authRepository: AuthRepository) {}

  async execute(userId: string, resetPasswordDto: ResetPasswordDto) {
    const { newPassword } = resetPasswordDto

    const hashedNewPassword = await hash(newPassword, 12)

    await this.authRepository.updatePassword(userId, hashedNewPassword)
  }
}
