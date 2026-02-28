import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthController } from './controller/auth.controller';
import { EmployeeController } from './controller/employee.controller';
import { Employee } from './entity/employee.entity';
import { Degree } from './entity/degree.entity';
import { JwtStrategy } from './jwt.strategy';
import { LocalStrategy } from './local.strategy';
import { AuthService } from './service/auth.service';
import { EmployeeService } from './service/employee.service';
import { DepartmentService } from './service/department.service';
import { Department } from './entity/department.entity';
import { DepartmentController } from './controller/department.controller';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('auth.jwtSecret'),
        signOptions: { expiresIn: configService.get('auth.jwtExpiresIn') },
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([Employee, Department, Degree]),
    SharedModule,
  ],
  providers: [AuthService, JwtStrategy, EmployeeService, LocalStrategy, DepartmentService],
  controllers: [AuthController, EmployeeController, DepartmentController],
  exports: [EmployeeService, DepartmentService],
})
export class AuthModule {}
