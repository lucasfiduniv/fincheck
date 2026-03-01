import { plainToInstance } from 'class-transformer'
import { IsNotEmpty, IsOptional, IsString, NotEquals, validateSync } from 'class-validator'

class Env {
  @IsString()
  @IsNotEmpty()
    dbURL: string

  @IsString()
  @IsNotEmpty()
  @NotEquals('unsecure_jwt_secret')
    jwtSecret: string

  @IsString()
  @IsNotEmpty()
  @NotEquals('unsecure_jwt_secret')
    resetPasswordJwtSecret: string

  @IsString()
  @IsNotEmpty()
    emailUser: string

  @IsString()
  @IsNotEmpty()
    emailPassword: string

  @IsString()
  @IsNotEmpty()
    frontendUrl: string

  @IsOptional()
  @IsString()
    evolutionApiUrl?: string

  @IsOptional()
  @IsString()
    evolutionApiKey?: string

  @IsOptional()
  @IsString()
    evolutionInstance?: string
}

export const env: Env = plainToInstance(Env, {
  jwtSecret: process.env.JWT_SECRET,
  resetPasswordJwtSecret: process.env.RESET_PASSWORD_JWT_SECRET,
  dbURL: process.env.DATABASE_URL,
  emailUser: process.env.EMAIL_USER,
  emailPassword: process.env.EMAIL_PASSWORD,
  frontendUrl: process.env.FRONTEND_URL,
  evolutionApiUrl: process.env.EVOLUTION_API_URL ?? process.env.NEXT_PUBLIC_EVOLUTION_API_URL,
  evolutionApiKey: process.env.EVOLUTION_API_KEY ?? process.env.NEXT_PUBLIC_EVOLUTION_API_KEY,
  evolutionInstance: process.env.EVOLUTION_INSTANCE ?? process.env.NEXT_PUBLIC_EVOLUTION_INSTANCE,
})

const errors = validateSync(env)

if (errors.length > 0) throw new Error(JSON.stringify(errors, null, 2))
