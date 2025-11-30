import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './lib/filters/http-exception.filter';
import { LoggingInterceptor } from './lib/interceptor/logging.interceptor';
import { EmployeeService } from './auth/service/employee.service';
import { ROLE } from './management/entity/constants';
import { GENDER } from './auth/entity/constant';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalInterceptors(new LoggingInterceptor());
  // Enable validation globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error for non-whitelisted properties
      transform: true, // Automatically transform payloads to DTO instances
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('OPSMATE')
    .setDescription('The OPSMATE API description')
    .setVersion('1.0')
    .addBearerAuth(
      // Adds a Bearer Token authorization option
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
    )
    .addSecurityRequirements('jwt')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });

  // --- Seeder: create a default admin if none exists ---
  try {
    const employeeService = app.get(EmployeeService);
    const defaultAdminEmail = process.env.DEFAULT_ADMIN_EMAIL ?? 'admin@example.com';
    const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD ?? 'admin123';

    const exists = await employeeService.checkEmail(defaultAdminEmail);
    if (!exists) {
      const adminDto: any = {
        firstName: 'System',
        lastName: 'Administrator',
        middleName: 'Sys',
        email: defaultAdminEmail,
        password: defaultAdminPassword,
        gender: GENDER.Male,
        dateOfBirth: new Date('1990-01-01'),
        department: undefined,
        roles: ROLE.ADMIN,
      };
      await employeeService.create(adminDto);
      // don't leak password in logs
      console.log(`Default admin created: ${defaultAdminEmail}`);
    } else {
      console.log(`Default admin exists: ${defaultAdminEmail}`);
    }
  } catch (err) {
    console.error('Error creating default admin:', err?.message ?? err);
  }

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
