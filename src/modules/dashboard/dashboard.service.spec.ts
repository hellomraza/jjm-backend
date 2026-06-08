import { Repository } from 'typeorm';
import { Agreement } from '../agreements/entities/agreement.entity';
import { District } from '../locations/entities/district.entity';
import { WorkItemComponent } from '../components/entities/work-item-component.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { WorkItem, WorkItemStatus } from '../work-items/entities/work-item.entity';
import { WorkItemEmployeeAssignment } from '../work-items/entities/work-item-employee-assignment.entity';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;

  const mockWorkItemRepository = {
    count: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  } as unknown as Repository<WorkItem>;

  const mockUserRepository = {
    count: jest.fn(),
    findOne: jest.fn(),
  } as unknown as Repository<User>;

  const mockAgreementRepository = {
    count: jest.fn(),
  } as unknown as Repository<Agreement>;

  const mockDistrictRepository = {
    findOne: jest.fn(),
  } as unknown as Repository<District>;

  const mockWorkItemComponentRepository = {
    count: jest.fn(),
  } as unknown as Repository<WorkItemComponent>;

  const mockWorkItemEmployeeAssignmentRepository = {
    count: jest.fn(),
  } as unknown as Repository<WorkItemEmployeeAssignment>;

  beforeEach(() => {
    service = new DashboardService(
      mockWorkItemRepository,
      mockUserRepository,
      mockAgreementRepository,
      mockDistrictRepository,
      mockWorkItemComponentRepository,
      mockWorkItemEmployeeAssignmentRepository,
    );
    jest.clearAllMocks();
  });

  describe('getStats', () => {
    it('should return Head Office statistics with overall agreement count', async () => {
      (mockWorkItemRepository.count as jest.Mock)
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(4)  // pending
        .mockResolvedValueOnce(3)  // inProgress
        .mockResolvedValueOnce(3); // completed

      (mockUserRepository.count as jest.Mock)
        .mockResolvedValueOnce(15) // EM
        .mockResolvedValueOnce(5)  // CO
        .mockResolvedValueOnce(2)  // DO
        .mockResolvedValueOnce(1)  // HO
        .mockResolvedValueOnce(23); // total

      (mockAgreementRepository.count as jest.Mock).mockResolvedValue(8);

      const result = await service.getStats('user-ho', UserRole.HO);

      expect(mockAgreementRepository.count).toHaveBeenCalledTimes(1);
      expect(mockAgreementRepository.count).toHaveBeenCalledWith();
      expect(result).toHaveProperty('totalAgreements', 8);
      expect(result).toHaveProperty('users');
      expect(result).toHaveProperty('workItems');
    });

    it('should return District Officer statistics with district-filtered agreement count', async () => {
      const doUser = { id: 'user-do', role: UserRole.DO, district_id: 'DIST-001' } as User;
      const district = { district_code: 'DIST-001', districtname: 'Test District' } as District;

      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(doUser);
      (mockDistrictRepository.findOne as jest.Mock).mockResolvedValue(district);

      (mockWorkItemRepository.count as jest.Mock)
        .mockResolvedValueOnce(5)  // total
        .mockResolvedValueOnce(2)  // pending
        .mockResolvedValueOnce(2)  // inProgress
        .mockResolvedValueOnce(1); // completed

      (mockWorkItemRepository.find as jest.Mock).mockResolvedValue([
        { id: 'w1', work_code: 'W-01', title: 'Work 1', status: WorkItemStatus.IN_PROGRESS, progress_percentage: 45 },
      ]);

      (mockAgreementRepository.count as jest.Mock).mockResolvedValue(4);

      const result = await service.getStats('user-do', UserRole.DO);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { id: 'user-do' } });
      expect(mockDistrictRepository.findOne).toHaveBeenCalledWith({ where: { district_code: 'DIST-001' } });
      expect(mockAgreementRepository.count).toHaveBeenCalledWith({
        where: { work: { district_id: 'DIST-001' } },
      });
      expect(result).toHaveProperty('districtName', 'Test District');
      expect(result).toHaveProperty('totalAgreements', 4);
    });

    it('should return Contractor statistics with contractor-filtered agreement count', async () => {
      (mockWorkItemRepository.find as jest.Mock).mockResolvedValue([
        { id: 'w1', work_code: 'W-01', title: 'Work 1', status: WorkItemStatus.IN_PROGRESS },
      ]);
      (mockWorkItemRepository.findOne as jest.Mock).mockResolvedValue({
        id: 'w1',
        work_code: 'W-01',
        title: 'Work 1',
        status: WorkItemStatus.IN_PROGRESS,
      });

      (mockWorkItemComponentRepository.count as jest.Mock).mockResolvedValue(2);
      (mockWorkItemEmployeeAssignmentRepository.count as jest.Mock).mockResolvedValue(5);
      (mockAgreementRepository.count as jest.Mock).mockResolvedValue(3);

      const result = await service.getStats('user-co', UserRole.CO);

      expect(mockWorkItemRepository.find).toHaveBeenCalledWith({
        where: { contractor_id: 'user-co' },
        order: { created_at: 'DESC' },
      });
      expect(mockAgreementRepository.count).toHaveBeenCalledWith({
        where: { contractor_id: 'user-co' },
      });
      expect(result).toHaveProperty('totalWorkItems', 1);
      expect(result).toHaveProperty('totalAgreements', 3);
    });
  });
});
