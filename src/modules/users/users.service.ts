import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { DeepPartial, Repository } from 'typeorm';
import { importContractorMapping } from '../import/import.service';
import { WorkItemEmployeeAssignment } from '../work-items/entities/work-item-employee-assignment.entity';
import { CreateContractorDto } from './dto/create-contractor.dto';
import { CreateDODto } from './dto/create-do.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateDODto } from './dto/update-do.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ContractorContract } from './entities/contractor-contract.entity';
import { EmployeeContract } from './entities/employee-contract.entity';
import { User, UserRole } from './entities/user.entity';

@Injectable()
export class UsersService {
  @InjectRepository(ContractorContract)
  private readonly contractorContractRepository!: Repository<ContractorContract>;

  @InjectRepository(EmployeeContract)
  private readonly employeeContractRepository!: Repository<EmployeeContract>;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(WorkItemEmployeeAssignment)
    private readonly workItemEmployeeAssignmentRepository: Repository<WorkItemEmployeeAssignment>,
  ) {}

  private stripPassword(user: User): Omit<User, 'password'> {
    const userWithoutPassword = {
      ...user,
    } as Omit<User, 'password'> & { password?: string };

    delete userWithoutPassword.password;
    return userWithoutPassword;
  }

  private buildNumericCodeBody(): string {
    const randomSuffix = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `${Date.now()}${randomSuffix}`.slice(-12);
  }

  private async generateUniqueUserCode(role: UserRole): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = `${role}${this.buildNumericCodeBody()}`;
      const exists = await this.userRepository.exists({
        where: { code: candidate },
      });

      if (!exists) {
        return candidate;
      }
    }

    throw new InternalServerErrorException(
      'Failed to generate unique user code',
    );
  }

  private async recordEmployeeContract(
    createdUser: User,
    creatorUserId: string,
    creatorRole: UserRole,
  ): Promise<void> {
    await this.employeeContractRepository.save(
      this.employeeContractRepository.create({
        created_by_id: creatorUserId,
        created_user_id: createdUser.id,
        created_by_role: creatorRole,
        created_user_role: createdUser.role,
      }),
    );
  }

  private async recordContractorContract(
    createdUser: User,
    creatorUserId: string,
    creatorRole: UserRole,
  ): Promise<void> {
    await this.contractorContractRepository.save(
      this.contractorContractRepository.create({
        created_by_id: creatorUserId,
        created_user_id: createdUser.id,
        created_by_role: creatorRole,
        created_user_role: createdUser.role,
      }),
    );
  }

  private normalizeImportString(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    if (
      typeof value !== 'string' &&
      typeof value !== 'number' &&
      typeof value !== 'boolean'
    ) {
      return null;
    }

    const normalized = String(value).trim();
    if (!normalized || normalized === '?') {
      return null;
    }

    return normalized;
  }

  private async ensureUniqueFieldAvailable(
    field: 'code' | 'email' | 'pan_number' | 'auid',
    value: string | null,
    currentUserId?: string,
  ): Promise<void> {
    if (!value) {
      return;
    }

    const existing = await this.userRepository.findOne({
      where: { [field]: value } as Partial<User>,
      select: ['id'],
    });

    if (existing && existing.id !== currentUserId) {
      throw new Error(`${field} already exists for another user`);
    }
  }

  async create(createUserDto: CreateUserDto): Promise<Omit<User, 'password'>> {
    const { email, password, name, role, district_id } = createUserDto;
    const resolvedRole = role ?? UserRole.EM;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException(`User with email ${email} already exists`);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create and save user
    const user: DeepPartial<User> = {
      code: await this.generateUniqueUserCode(resolvedRole),
      email,
      password: hashedPassword,
      name,
      role: resolvedRole,
      district_id,
    };
    const created = this.userRepository.create(user);
    const savedUser = await this.userRepository.save(created);

    // Return user without password
    return this.stripPassword(savedUser);
  }

  async createEmployee(
    createEmployeeDto: CreateEmployeeDto,
    creatorUserId: string,
    creatorRole: UserRole,
  ): Promise<Omit<User, 'password'>> {
    const { email, password, name } = createEmployeeDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException(`User with email ${email} already exists`);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create and save employee with EM role
    const employee = this.userRepository.create({
      code: await this.generateUniqueUserCode(UserRole.EM),
      email,
      password: hashedPassword,
      name,
      role: UserRole.EM,
      address: createEmployeeDto.address,
      district_name: createEmployeeDto.district_name,
      mobile: createEmployeeDto.mobile,
    });

    const savedEmployee = await this.userRepository.save(employee);

    await this.recordEmployeeContract(
      savedEmployee,
      creatorUserId,
      creatorRole,
    );

    // Return employee without password
    return this.stripPassword(savedEmployee);
  }

  async createContractor(
    createContractorDto: CreateContractorDto,
    creatorUserId: string,
    creatorRole: UserRole,
  ): Promise<Omit<User, 'password'>> {
    const { email, password, name } = createContractorDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException(`User with email ${email} already exists`);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create and save contractor with CO role
    const contractor = this.userRepository.create({
      code: await this.generateUniqueUserCode(UserRole.CO),
      email,
      password: hashedPassword,
      name,
      role: UserRole.CO,
      address: createContractorDto.address,
      district_name: createContractorDto.district_name,
      mobile: createContractorDto.mobile,
      pan_number: createContractorDto.pan_number,
    });

    const savedContractor = await this.userRepository.save(contractor);

    await this.recordContractorContract(
      savedContractor,
      creatorUserId,
      creatorRole,
    );

    // Return contractor without password
    return this.stripPassword(savedContractor);
  }

  async bulkCreateContractorsFromImport(
    contractors: Record<string, any>[],
  ): Promise<{
    inserted: Omit<User, 'password'>[];
    errors: { index: number; reason: string; item: Record<string, any> }[];
  }> {
    const inserted: Omit<User, 'password'>[] = [];
    const errors: {
      index: number;
      reason: string;
      item: Record<string, any>;
    }[] = [];

    for (let i = 0; i < contractors.length; i++) {
      const item: Record<string, unknown> = contractors[i] ?? {};
      try {
        const userPayload: Record<string, unknown> = {};
        const allowedFields = new Set([
          'auid',
          'contractorid',
          'code',
          'email',
          'password',
          'name',
          'mobile',
          'pan_number',
          'address',
          'designation',
        ]);

        // Map fields from contractor -> user using mapping
        for (const [userKey, contractorKey] of Object.entries(
          importContractorMapping,
        ) as Array<[string, string]>) {
          if (
            !allowedFields.has(userKey) ||
            !(contractorKey in item) ||
            item[contractorKey] == null
          ) {
            continue;
          }

          if (userKey === 'password') {
            userPayload[userKey] = item[contractorKey];
            continue;
          }

          const normalizedValue = this.normalizeImportString(
            item[contractorKey],
          );
          if (normalizedValue !== null) {
            userPayload[userKey] = normalizedValue;
          }
        }

        // Ensure role is contractor
        userPayload.role = UserRole.CO;

        // Ensure code exists; generate if missing
        if (!userPayload.code) {
          userPayload.code = await this.generateUniqueUserCode(UserRole.CO);
        }

        const contractorCode = String(userPayload.code);
        const normalizedEmail = this.normalizeImportString(userPayload.email);
        const normalizedPan = this.normalizeImportString(
          userPayload.pan_number,
        );
        const normalizedAuid = this.normalizeImportString(userPayload.auid);

        if (normalizedEmail) {
          userPayload.email = normalizedEmail;
        } else {
          delete userPayload.email;
        }

        if (normalizedPan) {
          userPayload.pan_number = normalizedPan;
        } else {
          delete userPayload.pan_number;
        }

        if (normalizedAuid) {
          userPayload.auid = normalizedAuid;
        } else {
          delete userPayload.auid;
        }

        // Password: must hash
        const rawPassword =
          typeof userPayload.password === 'string'
            ? userPayload.password
            : typeof userPayload.contractorpass === 'string'
              ? userPayload.contractorpass
              : null;

        if (!rawPassword) {
          throw new Error('missing password');
        }

        const hashed = await bcrypt.hash(String(rawPassword), 10);
        userPayload.password = hashed;

        const existingContractor = await this.userRepository.findOne({
          where: { code: contractorCode, role: UserRole.CO },
        });
        if (existingContractor) {
          try {
            await this.ensureUniqueFieldAvailable(
              'code',
              contractorCode,
              existingContractor.id,
            );
            await this.ensureUniqueFieldAvailable(
              'email',
              this.normalizeImportString(userPayload.email),
              existingContractor.id,
            );
            await this.ensureUniqueFieldAvailable(
              'pan_number',
              this.normalizeImportString(userPayload.pan_number),
              existingContractor.id,
            );
            await this.ensureUniqueFieldAvailable(
              'auid',
              this.normalizeImportString(userPayload.auid),
              existingContractor.id,
            );

            Object.assign(existingContractor, userPayload);
            const saved = await this.userRepository.save(existingContractor);

            inserted.push(this.stripPassword(saved));
            continue;
          } catch (updateErr) {
            const updateErrorMessage =
              updateErr instanceof Error
                ? updateErr.message
                : String(updateErr);
            throw new Error(
              `Failed to update existing contractor with code ${contractorCode}: ${updateErrorMessage}`,
            );
          }
        }

        await this.ensureUniqueFieldAvailable('code', contractorCode);
        await this.ensureUniqueFieldAvailable(
          'email',
          this.normalizeImportString(userPayload.email),
        );
        await this.ensureUniqueFieldAvailable(
          'pan_number',
          this.normalizeImportString(userPayload.pan_number),
        );
        await this.ensureUniqueFieldAvailable(
          'auid',
          this.normalizeImportString(userPayload.auid),
        );

        // Create and save
        const userEntity = this.userRepository.create(
          userPayload as Partial<User>,
        );
        const saved = await this.userRepository.save(userEntity);

        inserted.push(this.stripPassword(saved));
      } catch (err) {
        errors.push({
          index: i,
          reason: String(err instanceof Error ? err.message : err),
          item,
        });
      }
    }

    return { inserted, errors };
  }

  async createDO(createDODto: CreateDODto): Promise<Omit<User, 'password'>> {
    const { email, password, name, district_id, mobile } = createDODto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException(`User with email ${email} already exists`);
    }

    // Check if another DO already exists with the same district_id
    if (district_id) {
      const existingDO = await this.userRepository.findOne({
        where: { role: UserRole.DO, district_id },
      });
      if (existingDO) {
        throw new ConflictException(
          `Another district office manager already exists for this district`,
        );
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create and save DO with DO role
    const doObject: DeepPartial<User> = {
      code: await this.generateUniqueUserCode(UserRole.DO),
      email,
      password: hashedPassword,
      name,
      role: UserRole.DO,
      district_id,
      mobile,
    };
    const created = this.userRepository.create(doObject);
    const savedDO = await this.userRepository.save(created);

    // Return DO without password
    return this.stripPassword(savedDO);
  }

  async getMyCreatedUsers(
    creatorUserId: string,
    creatorRole: UserRole,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: Omit<User, 'password'>[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    if (creatorRole !== UserRole.CO && creatorRole !== UserRole.DO) {
      throw new BadRequestException(
        'Only contractor and district office users can access created users',
      );
    }

    const contractRepository =
      creatorRole === UserRole.CO
        ? this.employeeContractRepository
        : this.contractorContractRepository;

    const [contracts, total] = await contractRepository
      .createQueryBuilder('contract')
      .innerJoinAndSelect('contract.createdUser', 'user')
      .where('contract.created_by_id = :creatorUserId', { creatorUserId })
      .orderBy('contract.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const usersWithoutPassword = contracts.map((contract) =>
      this.stripPassword(contract.createdUser),
    );

    return {
      data: usersWithoutPassword,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findAll(
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: Omit<User, 'password'>[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const [users, total] = await this.userRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });

    // Remove password from all users
    const usersWithoutPassword = users.map((user) => this.stripPassword(user));

    return {
      data: usersWithoutPassword,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Omit<User, 'password'>> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }
    return this.stripPassword(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<Omit<User, 'password'>> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }

    // If password is being updated, hash it
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    // Check if email already exists (if email is being updated)
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      });
      if (existingUser) {
        throw new ConflictException(
          `User with email ${updateUserDto.email} already exists`,
        );
      }
    }
    // Update user
    Object.assign(user, updateUserDto);
    const updatedUser = await this.userRepository.save(user);

    return this.stripPassword(updatedUser);
  }

  async updateDO(
    id: string,
    updateDODto: UpdateDODto,
  ): Promise<Omit<User, 'password'>> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }

    if (user.role !== UserRole.DO) {
      throw new BadRequestException(
        `User #${id} is not a district office manager`,
      );
    }

    // If password is being updated, hash it
    if (updateDODto.password) {
      updateDODto.password = await bcrypt.hash(updateDODto.password, 10);
    }

    // Check if email already exists (if email is being updated)
    if (updateDODto.email && updateDODto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateDODto.email },
      });
      if (existingUser) {
        throw new ConflictException(
          `User with email ${updateDODto.email} already exists`,
        );
      }
    }

    // Check if district_id is being updated
    if (
      updateDODto.district_id &&
      updateDODto.district_id !== user.district_id
    ) {
      const existingDO = await this.userRepository.findOne({
        where: { role: UserRole.DO, district_id: updateDODto.district_id },
      });
      if (existingDO) {
        throw new ConflictException(
          `Another district office manager already exists for district ${updateDODto.district_id}`,
        );
      }
    }

    // Update user
    Object.assign(user, updateDODto);
    const updatedUser = await this.userRepository.save(user);

    return this.stripPassword(updatedUser);
  }

  async remove(id: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }
    await this.userRepository.remove(user);
  }

  async getMyProfile(userId: string): Promise<Omit<User, 'password'>> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['district'],
    });
    if (!user) {
      throw new NotFoundException(`User #${userId} not found`);
    }
    return this.stripPassword(user);
  }

  async comparePasswords(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async getAllEmployees(): Promise<Omit<User, 'password'>[]> {
    const employees = await this.userRepository.find({
      where: { role: UserRole.EM },
      order: { created_at: 'DESC' },
    });

    // Remove password from all employees
    return employees.map((employee) => this.stripPassword(employee));
  }

  async getAllContractors(): Promise<Omit<User, 'password'>[]> {
    const contractors = await this.userRepository
      .createQueryBuilder('user')
      .where('user.role = :role', { role: UserRole.CO })
      .andWhere(
        `NOT (
          user.email LIKE :temporaryEmailPattern
          AND user.name LIKE :temporaryNamePattern
        )`,
        {
          temporaryEmailPattern: 'temp-contractor-%@import.local',
          temporaryNamePattern: 'Temporary Contractor %',
        },
      )
      .orderBy('user.created_at', 'DESC')
      .getMany();

    // Remove password from all contractors
    return contractors.map((contractor) => this.stripPassword(contractor));
  }

  async getAllDOs(): Promise<Omit<User, 'password'>[]> {
    const dos = await this.userRepository.find({
      where: { role: UserRole.DO },
      relations: ['district'],
      order: { created_at: 'DESC' },
    });

    // Remove password from all DOs
    return dos.map((districtOffice) => this.stripPassword(districtOffice));
  }

  async getEmployeesByWorkItemId(
    workItemId: string,
  ): Promise<Omit<User, 'password'>[]> {
    const assignments = await this.workItemEmployeeAssignmentRepository.find({
      where: { work_item_id: workItemId },
      relations: ['employee'],
    });

    if (assignments.length === 0) {
      return [];
    }

    const employees = assignments.map((assignment) => assignment.employee);
    return employees.map((employee) => this.stripPassword(employee));
  }
}
