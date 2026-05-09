import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AgreementsModule } from './modules/agreements/agreements.module';
import { AuthModule } from './modules/auth/auth.module';
import { ComponentsModule } from './modules/components/components.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ImportModule } from './modules/import/import.module';
import { LocationsModule } from './modules/locations/locations.module';
import { PhotosModule } from './modules/photos/photos.module';
import { UsersModule } from './modules/users/users.module';
import { WorkItemsModule } from './modules/work-items/work-items.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        autoLoadEntities: true,
        synchronize: true,
        url: 'mysql://2FqoYp8JvbCHXrd.root:6OMFP6smhcS69NHy@gateway01.ap-southeast-1.prod.alicloud.tidbcloud.com:4000/test?ssl={"rejectUnauthorized":true}',
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        ssl: {
          rejectUnauthorized: true,
        },
      }),
    }),
    UsersModule,
    AuthModule,
    AgreementsModule,
    WorkItemsModule,
    ComponentsModule,
    PhotosModule,
    ImportModule,
    LocationsModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
