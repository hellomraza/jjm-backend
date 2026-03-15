import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  const usersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile();

    controller = moduleRef.get<UsersController>(UsersController);
    jest.clearAllMocks();
  });

  it('create delegates to service', async () => {
    const dto = { email: 'u@jjm.local' } as Parameters<
      UsersController['create']
    >[0];
    await controller.create(dto);
    expect(usersService.create).toHaveBeenCalledWith(dto);
  });

  it('findAll delegates to service', async () => {
    await controller.findAll(2, 10);
    expect(usersService.findAll).toHaveBeenCalledWith(2, 10);
  });

  it('findOne delegates to service', async () => {
    await controller.findOne('id-1');
    expect(usersService.findOne).toHaveBeenCalledWith('id-1');
  });

  it('update delegates to service', async () => {
    const dto = { name: 'Updated' } as Parameters<UsersController['update']>[1];
    await controller.update('id-1', dto);
    expect(usersService.update).toHaveBeenCalledWith('id-1', dto);
  });

  it('remove delegates to service', async () => {
    await controller.remove('id-1');
    expect(usersService.remove).toHaveBeenCalledWith('id-1');
  });
});
