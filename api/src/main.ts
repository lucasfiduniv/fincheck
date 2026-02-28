import 'dotenv/config'

import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ValidationPipe } from '@nestjs/common'
import { NextFunction, Request, Response } from 'express'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.use((request: Request, response: Response, next: NextFunction) => {
    response.header('Access-Control-Allow-Origin', '*')
    response.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS')
    response.header(
      'Access-Control-Allow-Headers',
      request.header('access-control-request-headers') ?? '*',
    )

    if (request.method === 'OPTIONS') {
      return response.sendStatus(204)
    }

    next()
  })

  app.useGlobalPipes(new ValidationPipe())
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: '*',
  })

  await app.listen(3000)
}
bootstrap()
