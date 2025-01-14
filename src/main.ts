import telemetry from './infrastructure/telemetry/telemetry.config'
telemetry()

import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { WinstonModule } from 'nest-winston'
import { winstonConfig } from './infrastructure/telemetry/winston.config'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { ValidationPipe, VersioningType } from '@nestjs/common'
import { GenericExceptionFilter } from './infrastructure/presentation/filters/generic-exceptions.filter'
import { HttpExceptionFilter } from './infrastructure/presentation/filters/http-exception.filter'
import { grpcClientOptions } from './infrastructure/presentation/grpc/grpc-client.options'
import { MicroserviceOptions } from '@nestjs/microservices'

const APP_ROUTE_PREFIX = 'api'

async function bootstrap() {
  const logger = WinstonModule.createLogger(winstonConfig)
  const app = await NestFactory.create(AppModule, { logger })

  app.useGlobalFilters(new GenericExceptionFilter(), new HttpExceptionFilter())

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  )

  app
    .enableVersioning({
      type: VersioningType.URI,
    })
    .setGlobalPrefix(APP_ROUTE_PREFIX)

  const config = new DocumentBuilder()
    .setTitle('Microservice Template')
    .setVersion('1.0')
    .build()

  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup(APP_ROUTE_PREFIX, app, document)

  app.connectMicroservice<MicroserviceOptions>(grpcClientOptions)
  await app.startAllMicroservices()
  logger.debug(`GRPC server is listening`, grpcClientOptions.options)

  await app.listen(Number(process.env.HTTP_PORT) || 3004)
  logger.log(`Application is running on: ${await app.getUrl()}`)
}
bootstrap()
