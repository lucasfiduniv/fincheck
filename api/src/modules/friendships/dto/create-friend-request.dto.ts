import { IsEmail, IsNotEmpty } from 'class-validator'

export class CreateFriendRequestDto {
  @IsEmail()
  @IsNotEmpty()
    email: string
}
