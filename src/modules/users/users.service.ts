import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { DataSource, DeepPartial, FindOptionsWhere, IsNull, Repository } from 'typeorm';
import { PaginatedResponse } from '../../common/types/response.type';
import { importContractorMapping } from '../import/import.service';
import { WorkItemEmployeeAssignment } from '../work-items/entities/work-item-employee-assignment.entity';
import { CreateContractorDto } from './dto/create-contractor.dto';
import { CreateDODto } from './dto/create-do.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateContractorDto } from './dto/update-contractor.dto';
import { UpdateDODto } from './dto/update-do.dto';
import { CreateTpiDto } from './dto/create-tpi.dto';
import { UpdateTpiDto } from './dto/update-tpi.dto';
import { CreateTpiStaffDto } from './dto/create-tpi-staff.dto';
import { UpdateTpiStaffDto } from './dto/update-tpi-staff.dto';
import { ContractorContract } from './entities/contractor-contract.entity';
import { EmployeeContract } from './entities/employee-contract.entity';
import { User, UserRole } from './entities/user.entity';
import { DistrictTpiAssignment } from './entities/district-tpi-assignment.entity';
import { TpiStaffRelationship } from './entities/tpi-staff-relationship.entity';

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
    private readonly dataSource: DataSource,
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
      where: { [field]: value } as FindOptionsWhere<User>,
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
    const { email, password, name, code } = createContractorDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException(`User with email ${email} already exists`);
    }

    // Check if user with this code already exists
    const existingUserByCode = await this.userRepository.findOne({
      where: { code },
    });
    if (existingUserByCode) {
      throw new ConflictException(`User with code ${code} already exists`);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create and save contractor with CO role
    const contractor = this.userRepository.create({
      code,
      email,
      password: hashedPassword,
      name,
      role: UserRole.CO,
      is_active: false,
      address: createContractorDto.address,
      district_name: createContractorDto.district_name,
      district_id: createContractorDto.district_id,
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

        // Ensure role is contractor and default to inactive
        userPayload.role = UserRole.CO;
        if (userPayload.is_active === undefined) {
          userPayload.is_active = false;
        }

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
          typeof userPayload.password === 'string' && userPayload.password.trim()
            ? userPayload.password.trim()
            : typeof item.contractorpass === 'string' && item.contractorpass.trim()
              ? item.contractorpass.trim()
              : `Temp@${crypto.randomBytes(4).toString('hex')}`;

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

            const normalizedAuid = this.normalizeImportString(userPayload.auid);
            if (normalizedAuid) {
              const existingAuidUser = await this.userRepository.findOne({
                where: { auid: normalizedAuid },
                select: ['id'],
              });
              if (existingAuidUser && existingAuidUser.id !== existingContractor.id) {
                delete userPayload.auid;
              }
            }

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

        const normalizedAuidNew = this.normalizeImportString(userPayload.auid);
        if (normalizedAuidNew) {
          const existingAuidUser = await this.userRepository.findOne({
            where: { auid: normalizedAuidNew },
            select: ['id'],
          });
          if (existingAuidUser) {
            delete userPayload.auid;
          }
        }

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

  async findByCode(code: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { code } });
  }

  async update(
    id: string,
    updateUserDto: UpdateContractorDto,
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

    // Check if code already exists (if code is being updated)
    if (updateUserDto.code && updateUserDto.code !== user.code) {
      const existingUserByCode = await this.userRepository.findOne({
        where: { code: updateUserDto.code },
      });
      if (existingUserByCode) {
        throw new ConflictException(
          `User with code ${updateUserDto.code} already exists`,
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

  async resetPassword(email: string, plainPassword: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }
    user.password = await bcrypt.hash(plainPassword, 10);
    await this.userRepository.save(user);
  }


  async getAllEmployees(): Promise<Omit<User, 'password'>[]> {
    const employees = await this.userRepository.find({
      where: { role: UserRole.EM },
      order: { created_at: 'DESC' },
    });

    // Remove password from all employees
    return employees.map((employee) => this.stripPassword(employee));
  }

  async getAllContractors(
    requesterUserId: string,
    requesterRole: UserRole,
    page: number = 1,
    limit: number = 20,
    search?: string,
  ): Promise<PaginatedResponse<Omit<User, 'password'>>> {
    const query = this.userRepository
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
      );

    if (requesterRole === UserRole.DO) {
      const requester = await this.userRepository.findOne({
        where: { id: requesterUserId, role: UserRole.DO },
        select: ['id', 'district_id'],
      });

      if (!requester?.district_id) {
        return {
          data: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        };
      }

      query.andWhere(
        `(
          user.district_id = :requesterDistrictId
          OR EXISTS (
            SELECT 1 FROM work_items wi
            LEFT JOIN agreements ag ON wi.agreement_id = ag.id
            WHERE (wi.contractor_id = user.id OR ag.contractor_id = user.id)
              AND wi.district_id = :requesterDistrictId
          )
        )`,
        { requesterDistrictId: requester.district_id },
      );
    }

    if (search && search.trim()) {
      const s = search.trim();
      query.andWhere(
        '(user.name LIKE :search OR user.email LIKE :search OR user.code LIKE :search OR user.mobile LIKE :search OR user.pan_number LIKE :search)',
        { search: `%${s}%` },
      );
    }

    const skip = (page - 1) * limit;
    const [contractors, total] = await query
      .orderBy('user.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const data = contractors.map((contractor) => this.stripPassword(contractor));
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data,
      total,
      limit,
      page,
      totalPages,
    };
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

  async updateContractorStatus(
    id: string,
    is_active: boolean,
    requesterUserId: string,
    requesterRole: UserRole,
  ): Promise<Omit<User, 'password'>> {
    const contractor = await this.userRepository.findOne({ where: { id } });
    if (!contractor || contractor.role !== UserRole.CO) {
      throw new NotFoundException(`Contractor #${id} not found`);
    }

    if (requesterRole === UserRole.DO) {
      const requester = await this.userRepository.findOne({
        where: { id: requesterUserId, role: UserRole.DO },
        select: ['id', 'district_id'],
      });

      if (!requester?.district_id) {
        throw new ForbiddenException(
          'District Officers without an assigned district cannot modify contractor status',
        );
      }

      const isBelongingToDistrict =
        contractor.district_id === requester.district_id;

      if (!isBelongingToDistrict) {
        const hasAssignedWorkItem = await this.userRepository
          .createQueryBuilder('user')
          .where('user.id = :contractorId', { contractorId: id })
          .andWhere(
            `EXISTS (
              SELECT 1 FROM work_items wi
              LEFT JOIN agreements ag ON wi.agreement_id = ag.id
              WHERE (wi.contractor_id = user.id OR ag.contractor_id = user.id)
                AND wi.district_id = :requesterDistrictId
            )`,
            { requesterDistrictId: requester.district_id },
          )
          .getExists();

        if (!hasAssignedWorkItem) {
          throw new ForbiddenException(
            'You can only modify status for contractors in your district or assigned to work items in your district',
          );
        }
      }
    }

    contractor.is_active = is_active;
    const updated = await this.userRepository.save(contractor);
    return this.stripPassword(updated);
  }

  async createTpi(dto: CreateTpiDto): Promise<Omit<User, 'password'>> {
    return await this.dataSource.transaction(async (manager) => {
      const existingUser = await manager.findOne(User, { where: { email: dto.email } });
      if (existingUser) {
        throw new ConflictException(`User with email ${dto.email} already exists`);
      }

      const existingCode = await manager.findOne(User, { where: { code: dto.code } });
      if (existingCode) {
        throw new ConflictException(`User with code ${dto.code} already exists`);
      }

      const activeTpi = await manager.findOne(User, {
        where: { role: UserRole.TPI, district_id: dto.district_id, is_active: true },
      });
      if (activeTpi) {
        throw new ConflictException(`An active TPI agency already exists in district ${dto.district_id}`);
      }

      const hashedPassword = await bcrypt.hash(dto.password, 10);

      const tpi = manager.create(User, {
        code: dto.code,
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        role: UserRole.TPI,
        mobile: dto.mobile,
        pan_number: dto.pan_number,
        address: dto.address,
        designation: dto.designation,
        district_id: dto.district_id,
        is_active: true,
      });

      const savedTpi = await manager.save(User, tpi);

      const assignment = manager.create(DistrictTpiAssignment, {
        district_code: dto.district_id,
        tpi_id: savedTpi.id,
        is_active: true,
        assigned_at: new Date(),
      });
      await manager.save(DistrictTpiAssignment, assignment);

      return this.stripPassword(savedTpi);
    });
  }

  async findAllTpis(
    page: number = 1,
    limit: number = 20,
    search?: string,
    districtId?: string,
    isActive?: boolean,
  ): Promise<PaginatedResponse<Omit<User, 'password'>>> {
    const query = this.userRepository
      .createQueryBuilder('user')
      .where('user.role = :role', { role: UserRole.TPI });

    if (districtId) {
      query.andWhere('user.district_id = :districtId', { districtId });
    }

    if (isActive !== undefined) {
      query.andWhere('user.is_active = :isActive', { isActive });
    }

    if (search && search.trim()) {
      const s = search.trim();
      query.andWhere(
        '(user.name LIKE :search OR user.email LIKE :search OR user.code LIKE :search OR user.mobile LIKE :search OR user.pan_number LIKE :search)',
        { search: `%${s}%` },
      );
    }

    const skip = (page - 1) * limit;
    const [tpis, total] = await query
      .orderBy('user.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const usersWithoutPassword = tpis.map((user) => this.stripPassword(user));

    return {
      data: usersWithoutPassword,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateTpi(id: string, dto: UpdateTpiDto): Promise<Omit<User, 'password'>> {
    return await this.dataSource.transaction(async (manager) => {
      const tpi = await manager.findOne(User, { where: { id, role: UserRole.TPI } });
      if (!tpi) {
        throw new NotFoundException(`TPI user #${id} not found`);
      }

      if (dto.email && dto.email !== tpi.email) {
        const existingEmail = await manager.findOne(User, { where: { email: dto.email } });
        if (existingEmail) {
          throw new ConflictException(`User with email ${dto.email} already exists`);
        }
      }

      if (dto.code && dto.code !== tpi.code) {
        const existingCode = await manager.findOne(User, { where: { code: dto.code } });
        if (existingCode) {
          throw new ConflictException(`User with code ${dto.code} already exists`);
        }
      }

      const newDistrict = dto.district_id ?? tpi.district_id;
      const isDistrictChanging = dto.district_id && dto.district_id !== tpi.district_id;

      if (tpi.is_active && isDistrictChanging) {
        const activeTpiInTarget = await manager.findOne(User, {
          where: { role: UserRole.TPI, district_id: newDistrict, is_active: true },
        });
        if (activeTpiInTarget && activeTpiInTarget.id !== tpi.id) {
          throw new ConflictException(`An active TPI agency already exists in district ${newDistrict}`);
        }
      }

      if (dto.password) {
        tpi.password = await bcrypt.hash(dto.password, 10);
      }

      const { password, ...updateData } = dto;
      Object.assign(tpi, updateData);
      const saved = await manager.save(User, tpi);

      if (isDistrictChanging) {
        await manager.update(
          DistrictTpiAssignment,
          { tpi_id: tpi.id, ended_at: IsNull() },
          { ended_at: new Date(), is_active: false },
        );

        const assignment = manager.create(DistrictTpiAssignment, {
          district_code: newDistrict!,
          tpi_id: tpi.id,
          is_active: tpi.is_active,
          assigned_at: new Date(),
        });
        await manager.save(DistrictTpiAssignment, assignment);
      }

      return this.stripPassword(saved);
    });
  }

  async updateTpiStatus(id: string, is_active: boolean): Promise<Omit<User, 'password'>> {
    return await this.dataSource.transaction(async (manager) => {
      const tpi = await manager.findOne(User, { where: { id, role: UserRole.TPI } });
      if (!tpi) {
        throw new NotFoundException(`TPI user #${id} not found`);
      }

      if (tpi.is_active === is_active) {
        return this.stripPassword(tpi);
      }

      if (is_active) {
        const activeTpi = await manager.findOne(User, {
          where: { role: UserRole.TPI, district_id: tpi.district_id, is_active: true },
        });
        if (activeTpi && activeTpi.id !== tpi.id) {
          throw new ConflictException(`An active TPI agency already exists in district ${tpi.district_id}`);
        }

        const assignment = manager.create(DistrictTpiAssignment, {
          district_code: tpi.district_id!,
          tpi_id: tpi.id,
          is_active: true,
          assigned_at: new Date(),
        });
        await manager.save(DistrictTpiAssignment, assignment);
      } else {
        await manager.update(
          DistrictTpiAssignment,
          { tpi_id: tpi.id, ended_at: IsNull() },
          { ended_at: new Date(), is_active: false },
        );
      }

      tpi.is_active = is_active;
      const saved = await manager.save(User, tpi);
      return this.stripPassword(saved);
    });
  }

  async createTpiStaff(dto: CreateTpiStaffDto, tpiId: string): Promise<Omit<User, 'password'>> {
    return await this.dataSource.transaction(async (manager) => {
      const tpi = await manager.findOne(User, { where: { id: tpiId, role: UserRole.TPI } });
      if (!tpi) {
        throw new NotFoundException('Parent TPI user not found');
      }
      if (!tpi.is_active) {
        throw new BadRequestException('Cannot create staff for an inactive TPI agency');
      }

      const existingUser = await manager.findOne(User, { where: { email: dto.email } });
      if (existingUser) {
        throw new ConflictException(`User with email ${dto.email} already exists`);
      }

      const hashedPassword = await bcrypt.hash(dto.password, 10);

      const staff = manager.create(User, {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        role: UserRole.TPI_STAFF,
        is_active: true,
        district_id: tpi.district_id,
      });

      const savedStaff = await manager.save(User, staff);

      const relationship = manager.create(TpiStaffRelationship, {
        tpi_id: tpi.id,
        staff_id: savedStaff.id,
      });
      await manager.save(TpiStaffRelationship, relationship);

      return this.stripPassword(savedStaff);
    });
  }

  async findAllTpiStaff(
    tpiId: string,
    page: number = 1,
    limit: number = 20,
    search?: string,
  ): Promise<PaginatedResponse<Omit<User, 'password'>>> {
    const skip = (page - 1) * limit;

    const relationships = await this.dataSource.getRepository(TpiStaffRelationship).find({
      where: { tpi_id: tpiId },
      select: ['staff_id'],
    });

    const staffIds = relationships.map((r) => r.staff_id);
    if (staffIds.length === 0) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    const query = this.userRepository
      .createQueryBuilder('user')
      .where('user.id IN (:...staffIds)', { staffIds });

    if (search && search.trim()) {
      const s = search.trim();
      query.andWhere(
        '(user.name LIKE :search OR user.email LIKE :search OR user.mobile LIKE :search)',
        { search: `%${s}%` },
      );
    }

    const [staff, total] = await query
      .orderBy('user.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const result = staff.map((s) => this.stripPassword(s));

    return {
      data: result,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateTpiStaff(
    id: string,
    tpiId: string,
    dto: UpdateTpiStaffDto,
  ): Promise<Omit<User, 'password'>> {
    return await this.dataSource.transaction(async (manager) => {
      const rel = await manager.findOne(TpiStaffRelationship, {
        where: { staff_id: id, tpi_id: tpiId },
      });
      if (!rel) {
        throw new ForbiddenException('You do not own this TPI staff member');
      }

      const staff = await manager.findOne(User, { where: { id, role: UserRole.TPI_STAFF } });
      if (!staff) {
        throw new NotFoundException(`TPI staff #${id} not found`);
      }

      if (dto.email && dto.email !== staff.email) {
        const existingEmail = await manager.findOne(User, { where: { email: dto.email } });
        if (existingEmail) {
          throw new ConflictException(`User with email ${dto.email} already exists`);
        }
      }

      if (dto.password) {
        staff.password = await bcrypt.hash(dto.password, 10);
      }

      const { password, ...updateData } = dto;
      Object.assign(staff, updateData);
      const saved = await manager.save(User, staff);

      return this.stripPassword(saved);
    });
  }
}
