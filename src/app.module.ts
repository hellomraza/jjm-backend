import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { databaseConfig } from './config/database.config';
import { AgreementsModule } from './modules/agreements/agreements.module';
import { AuthModule } from './modules/auth/auth.module';
import { ComponentsModule } from './modules/components/components.module';
import { LocationsModule } from './modules/locations/locations.module';
import { PhotosModule } from './modules/photos/photos.module';
import { UsersModule } from './modules/users/users.module';
import { WorkItemsModule } from './modules/work-items/work-items.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Rate limiting configuration for brute-force protection
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000, // 1 minute
        limit: 5, // 5 requests per minute (IP-based)
      },
      {
        name: 'long',
        ttl: 15 * 60 * 1000, // 15 minutes
        limit: 15, // 15 requests per 15 minutes
      },
    ]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        databaseConfig(configService),
    }),
    UsersModule,
    AuthModule,
    AgreementsModule,
    WorkItemsModule,
    ComponentsModule,
    PhotosModule,
    LocationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
