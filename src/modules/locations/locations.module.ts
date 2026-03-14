import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Block } from './entities/block.entity';
import { Circle } from './entities/circle.entity';
import { District } from './entities/district.entity';
import { Panchayat } from './entities/panchayat.entity';
import { Subdivision } from './entities/subdivision.entity';
import { Village } from './entities/village.entity';
import { Zone } from './entities/zone.entity';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      District,
      Block,
      Panchayat,
      Village,
      Subdivision,
      Circle,
      Zone,
    ]),
  ],
  controllers: [LocationsController],
  providers: [LocationsService],
  exports: [LocationsService],
})
export class LocationsModule {}
