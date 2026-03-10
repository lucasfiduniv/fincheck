import { Injectable } from '@nestjs/common'
import { UsersRepository } from 'src/shared/database/repositories/users.repository'

@Injectable()
export class AuthRepository {
  constructor(private readonly usersRepo: UsersRepository) {}

  findByEmail(email: string) {
    return this.usersRepo.findUnique({
      where: { email },
    })
  }

  isEmailTaken(email: string) {
    return this.usersRepo.findUnique({
      where: { email },
      select: { id: true },
    })
  }

  createUserWithDefaultCategories(data: {
    name: string
    email: string
    password: string
  }) {
    return this.usersRepo.create({
      data: {
        ...data,
        categories: {
          createMany: {
            data: [
              { name: 'Salário', icon: 'salary', type: 'INCOME' },
              { name: 'Freelance', icon: 'freelance', type: 'INCOME' },
              { name: 'Outro', icon: 'other', type: 'INCOME' },
              { name: 'Casa', icon: 'home', type: 'EXPENSE' },
              { name: 'Alimentação', icon: 'food', type: 'EXPENSE' },
              { name: 'Educação', icon: 'education', type: 'EXPENSE' },
              { name: 'Lazer', icon: 'fun', type: 'EXPENSE' },
              { name: 'Mercado', icon: 'grocery', type: 'EXPENSE' },
              { name: 'Roupas', icon: 'clothes', type: 'EXPENSE' },
              { name: 'Transporte', icon: 'transport', type: 'EXPENSE' },
              { name: 'Combustível', icon: 'fuel', type: 'EXPENSE' },
              { name: 'Viagem', icon: 'travel', type: 'EXPENSE' },
              { name: 'Outro', icon: 'other', type: 'EXPENSE' },
            ],
          },
        },
      },
    })
  }

  updatePassword(userId: string, password: string) {
    return this.usersRepo.update({
      where: { id: userId },
      data: { password },
    })
  }
}
