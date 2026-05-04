import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { WorkItemEmployeeAssignment } from '../work-items/entities/work-item-employee-assignment.entity';
import { CreateContractorDto } from './dto/create-contractor.dto';
import { CreateDODto } from './dto/create-do.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { CreateUserDto } from './dto/create-user.dto';
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
    const user = this.userRepository.create({
      code: await this.generateUniqueUserCode(resolvedRole),
      email,
      password: hashedPassword,
      name,
      role: resolvedRole,
      district_id,
    });

    const savedUser = await this.userRepository.save(user);

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

  async createDO(createDODto: CreateDODto): Promise<Omit<User, 'password'>> {
    const { email, password, name, district_id } = createDODto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException(`User with email ${email} already exists`);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create and save DO with DO role
    const districtOffice = this.userRepository.create({
      code: await this.generateUniqueUserCode(UserRole.DO),
      email,
      password: hashedPassword,
      name,
      role: UserRole.DO,
      district_id,
    });

    const savedDO = await this.userRepository.save(districtOffice);

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

  async remove(id: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }
    await this.userRepository.remove(user);
  }

  async getMyProfile(userId: string): Promise<Omit<User, 'password'>> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
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
    const contractors = await this.userRepository.find({
      where: { role: UserRole.CO },
      order: { created_at: 'DESC' },
    });

    // Remove password from all contractors
    return contractors.map((contractor) => this.stripPassword(contractor));
  }

  async getAllDOs(): Promise<Omit<User, 'password'>[]> {
    const dos = await this.userRepository.find({
      where: { role: UserRole.DO },
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
