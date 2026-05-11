import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  const synchronize = configService.get('DB_SYNCHRONIZE') === 'true';
  const host = configService.get('DB_HOST') ?? 'localhost';
  const sslSetting = configService.get('DB_SSL');
  const useSsl =
    sslSetting === 'true' ||
    (sslSetting !== 'false' && !['localhost', '127.0.0.1', '::1'].includes(host));

  return {
    type: 'mysql',
    host,
    port: parseInt(configService.get('DB_PORT') ?? '3306', 10),
    username: configService.get('DB_USERNAME'),
    password: configService.get('DB_PASSWORD'),
    database: configService.get('DB_DATABASE'),
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize,
    migrationsRun: true,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    extra: {
      connectTimeout: 60000, // 60 sec
    },
    migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
  };
};
