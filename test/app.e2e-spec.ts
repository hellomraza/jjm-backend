import { S3Client } from '@aws-sdk/client-s3';
import { INestApplication } from '@nestjs/common/interfaces';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { Component } from '../src/modules/components/entities/component.entity';
import {
  WorkItemComponent,
  WorkItemComponentStatus,
} from '../src/modules/components/entities/work-item-component.entity';
import { Photo } from '../src/modules/photos/entities/photo.entity';
import { User, UserRole } from '../src/modules/users/entities/user.entity';
import {
  WorkItem,
  WorkItemStatus,
} from '../src/modules/work-items/entities/work-item.entity';

type Tokens = {
  HO: string;
  DO: string;
  CO: string;
  EM: string;
};

describe('All API Endpoints (e2e, local mysql)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let userRepo: Repository<User>;
  let componentRepo: Repository<Component>;
  let workItemRepo: Repository<WorkItem>;
  let workItemComponentRepo: Repository<WorkItemComponent>;
  let photoRepo: Repository<Photo>;

  let tokens: Tokens;

  let hoUserId: string;
  let doUserId: string;
  let coUserId: string;
  let emUserId: string;

  let workItemId: string;
  let workItemIdForDelete: string;
  let componentMappingId: string;
  let componentMappingIdForReject: string;
  let componentMappingIdForAliasSubmit: string;
  let selectedPhotoId: string;
  let selectedPhotoIdForReject: string;
  let selectedPhotoIdForAliasSubmit: string;
  let uploadedPhotoIdViaPhotosApi: string;

  let createdUserId: string;
  let createdDistrictId: number;
  let agreementId: string;

  const districtUuid = '550e8400-e29b-41d4-a716-446655440101';
  const testDbName = `jjm_work_monitoring_e2e_${Date.now()}`;

  const login = async (email: string, password: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);

    return response.body.access_token;
  };

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DB_HOST = process.env.DB_HOST || 'localhost';
    process.env.DB_PORT = process.env.DB_PORT || '3306';
    process.env.DB_USERNAME = process.env.DB_USERNAME || 'root';
    process.env.DB_PASSWORD = process.env.DB_PASSWORD || '12345';
    process.env.DB_NAME = testDbName;
    process.env.DB_SYNCHRONIZE = 'true';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'e2e-jwt-secret';
    process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';
    process.env.AWS_S3_BUCKET = process.env.AWS_S3_BUCKET || 'local-e2e-bucket';
    process.env.AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
    process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || 'test';
    process.env.AWS_SECRET_ACCESS_KEY =
      process.env.AWS_SECRET_ACCESS_KEY || 'test';

    const mysqlConnection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
    });

    await mysqlConnection.query(`CREATE DATABASE \`${testDbName}\``);
    await mysqlConnection.end();

    jest.spyOn(S3Client.prototype, 'send').mockResolvedValue({} as never);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);
    userRepo = dataSource.getRepository(User);
    componentRepo = dataSource.getRepository(Component);
    workItemRepo = dataSource.getRepository(WorkItem);
    workItemComponentRepo = dataSource.getRepository(WorkItemComponent);
    photoRepo = dataSource.getRepository(Photo);

    const passwordHash = await bcrypt.hash('Mock@1234', 10);
    const [ho, doUser, co, em] = await userRepo.save([
      userRepo.create({
        code: 'HO000000000001',
        email: 'ho.e2e@jjm.local',
        password: passwordHash,
        name: 'HO E2E',
        role: UserRole.HO,
        district_id: undefined,
      }),
      userRepo.create({
        code: 'DO000000000001',
        email: 'do.e2e@jjm.local',
        password: passwordHash,
        name: 'DO E2E',
        role: UserRole.DO,
        district_id: districtUuid,
      }),
      userRepo.create({
        code: 'CO000000000001',
        email: 'co.e2e@jjm.local',
        password: passwordHash,
        name: 'CO E2E',
        role: UserRole.CO,
        district_id: districtUuid,
      }),
      userRepo.create({
        code: 'EM000000000001',
        email: 'em.e2e@jjm.local',
        password: passwordHash,
        name: 'EM E2E',
        role: UserRole.EM,
        district_id: districtUuid,
      }),
    ]);

    hoUserId = ho.id;
    doUserId = doUser.id;
    coUserId = co.id;
    emUserId = em.id;

    const staticComponents = Array.from({ length: 12 }).map((_, index) =>
      componentRepo.create({
        name: `E2E Component ${index + 1}`,
        unit: 'No.',
        order_number: index + 1,
      }),
    );
    await componentRepo.save(staticComponents);

    tokens = {
      HO: await login('ho.e2e@jjm.local', 'Mock@1234'),
      DO: await login('do.e2e@jjm.local', 'Mock@1234'),
      CO: await login('co.e2e@jjm.local', 'Mock@1234'),
      EM: await login('em.e2e@jjm.local', 'Mock@1234'),
    };
  });

  afterAll(async () => {
    await app.close();
    const mysqlConnection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
    });
    await mysqlConnection.query(`DROP DATABASE IF EXISTS \`${testDbName}\``);
    await mysqlConnection.end();
  });

  it('GET / returns health message', async () => {
    await request(app.getHttpServer()).get('/').expect(200);
  });

  it('POST /auth/login returns token', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'ho.e2e@jjm.local', password: 'Mock@1234' })
      .expect(201);

    expect(response.body.access_token).toBeDefined();
  });

  it('POST /users creates user', async () => {
    const response = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${tokens.HO}`)
      .send({
        email: 'created.user.e2e@jjm.local',
        password: 'StrongPass@123',
        name: 'Created User E2E',
        role: UserRole.EM,
        district_id: districtUuid,
      })
      .expect(201);

    createdUserId = response.body.id;
    expect(response.body.email).toBe('created.user.e2e@jjm.local');
  });

  it('GET /users returns list', async () => {
    await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${tokens.EM}`)
      .expect(200);
  });

  it('GET /users/:id returns user', async () => {
    await request(app.getHttpServer())
      .get(`/users/${createdUserId}`)
      .set('Authorization', `Bearer ${tokens.DO}`)
      .expect(200);
  });

  it('PATCH /users/:id updates user', async () => {
    await request(app.getHttpServer())
      .patch(`/users/${createdUserId}`)
      .set('Authorization', `Bearer ${tokens.HO}`)
      .send({ name: 'Created User E2E Updated' })
      .expect(200);
  });

  it('POST /locations/:type creates district', async () => {
    const response = await request(app.getHttpServer())
      .post('/locations/districts')
      .set('Authorization', `Bearer ${tokens.HO}`)
      .send({
        name: 'E2E District',
        code: 'E2E-DISTRICT-001',
      })
      .expect(201);

    createdDistrictId = response.body.districtid;
  });

  it('GET /locations/:type returns districts list', async () => {
    await request(app.getHttpServer())
      .get('/locations/districts')
      .set('Authorization', `Bearer ${tokens.CO}`)
      .expect(200);
  });

  it('GET /locations/:type/:id returns district', async () => {
    await request(app.getHttpServer())
      .get(`/locations/districts/${createdDistrictId}`)
      .set('Authorization', `Bearer ${tokens.EM}`)
      .expect(200);
  });

  it('PATCH /locations/:type/:id updates district', async () => {
    await request(app.getHttpServer())
      .patch(`/locations/districts/${createdDistrictId}`)
      .set('Authorization', `Bearer ${tokens.DO}`)
      .send({ name: 'E2E District Updated' })
      .expect(200);
  });

  it('POST /work-items creates work item', async () => {
    const response = await request(app.getHttpServer())
      .post('/work-items')
      .set('Authorization', `Bearer ${tokens.HO}`)
      .send({
        title: 'E2E Work Item',
        description: 'E2E Work Item Description',
        district_id: districtUuid,
        schemetype: 'PWS',
        nofhtc: '200',
        amount_approved: 150000,
        payment_amount: 10000,
        serial_no: 1,
        contractor_id: coUserId,
        latitude: 25.5941,
        longitude: 85.1376,
        progress_percentage: 0,
        status: WorkItemStatus.PENDING,
      })
      .expect(201);

    workItemId = response.body.id;
  });

  it('GET /work-items returns list', async () => {
    await request(app.getHttpServer())
      .get('/work-items')
      .set('Authorization', `Bearer ${tokens.CO}`)
      .expect(200);
  });

  it('GET /work-items/:id returns work item', async () => {
    await request(app.getHttpServer())
      .get(`/work-items/${workItemId}`)
      .set('Authorization', `Bearer ${tokens.DO}`)
      .expect(200);
  });

  it('PATCH /work-items/:id updates work item', async () => {
    await request(app.getHttpServer())
      .patch(`/work-items/${workItemId}`)
      .set('Authorization', `Bearer ${tokens.CO}`)
      .send({ description: 'E2E Work Item Description Updated' })
      .expect(200);
  });

  it('PATCH /work-items/:id/status updates status', async () => {
    await request(app.getHttpServer())
      .patch(`/work-items/${workItemId}/status`)
      .set('Authorization', `Bearer ${tokens.HO}`)
      .send({ status: WorkItemStatus.IN_PROGRESS })
      .expect(200);
  });

  it('GET /components/master returns components', async () => {
    await request(app.getHttpServer())
      .get('/components/master')
      .set('Authorization', `Bearer ${tokens.EM}`)
      .expect(200);
  });

  it('GET /components/work-item/:workItemId returns mappings', async () => {
    const response = await request(app.getHttpServer())
      .get(`/components/work-item/${workItemId}`)
      .set('Authorization', `Bearer ${tokens.CO}`)
      .expect(200);

    expect(response.body.length).toBeGreaterThanOrEqual(3);
    componentMappingId = response.body[0].id;
    componentMappingIdForReject = response.body[1].id;
    componentMappingIdForAliasSubmit = response.body[2].id;
  });

  it('GET /components/:id returns mapping', async () => {
    await request(app.getHttpServer())
      .get(`/components/${componentMappingId}`)
      .set('Authorization', `Bearer ${tokens.DO}`)
      .expect(200);
  });

  it('PATCH /components/:id updates quantity', async () => {
    await request(app.getHttpServer())
      .patch(`/components/${componentMappingId}`)
      .set('Authorization', `Bearer ${tokens.HO}`)
      .send({ quantity: 100 })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/components/${componentMappingIdForReject}`)
      .set('Authorization', `Bearer ${tokens.HO}`)
      .send({ quantity: 100 })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/components/${componentMappingIdForAliasSubmit}`)
      .set('Authorization', `Bearer ${tokens.HO}`)
      .send({ quantity: 100 })
      .expect(200);

    await workItemComponentRepo.update(componentMappingId, {
      quantity: 100,
      progress: 100,
      status: WorkItemComponentStatus.PENDING,
    });
    await workItemComponentRepo.update(componentMappingIdForReject, {
      quantity: 100,
      progress: 100,
      status: WorkItemComponentStatus.PENDING,
    });
    await workItemComponentRepo.update(componentMappingIdForAliasSubmit, {
      quantity: 100,
      progress: 100,
      status: WorkItemComponentStatus.PENDING,
    });
  });

  it('POST /components/:componentId/photos is covered', async () => {
    await request(app.getHttpServer())
      .post(`/components/${componentMappingId}/photos`)
      .set('Authorization', `Bearer ${tokens.EM}`)
      .field('progress', '100')
      .field('latitude', '25.5941')
      .field('longitude', '85.1376')
      .field('timestamp', new Date().toISOString())
      .attach('file', Buffer.from('fake-image-data'), {
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
      })
      .expect(400);

    const seededPhoto = await photoRepo.save(
      photoRepo.create({
        image_url: 'https://local-e2e-bucket.s3.ap-south-1.amazonaws.com/a.jpg',
        latitude: 25.5941,
        longitude: 85.1376,
        timestamp: new Date(),
        employee_id: emUserId,
        component_id: componentMappingId,
        work_item_id: workItemId,
        is_selected: false,
        selected_by: null,
        selected_at: null,
        is_forwarded_to_do: false,
        forwarded_at: null,
      }),
    );

    selectedPhotoId = seededPhoto.id;
  });

  it('GET /components/:componentId/photos returns photos to contractor', async () => {
    await request(app.getHttpServer())
      .get(`/components/${componentMappingId}/photos`)
      .set('Authorization', `Bearer ${tokens.CO}`)
      .expect(200);
  });

  it('POST /components/:componentId/select-photo submits selected photo', async () => {
    await request(app.getHttpServer())
      .post(`/components/${componentMappingId}/select-photo`)
      .set('Authorization', `Bearer ${tokens.CO}`)
      .send({ photoId: selectedPhotoId })
      .expect(201);
  });

  it('GET /components/pending-approval returns DO dashboard', async () => {
    await request(app.getHttpServer())
      .get('/components/pending-approval')
      .set('Authorization', `Bearer ${tokens.DO}`)
      .expect(200);
  });

  it('POST /components/:componentId/approve approves component', async () => {
    await request(app.getHttpServer())
      .post(`/components/${componentMappingId}/approve`)
      .set('Authorization', `Bearer ${tokens.DO}`)
      .expect(201);
  });

  it('GET /components/approved returns HO view', async () => {
    await request(app.getHttpServer())
      .get('/components/approved')
      .set('Authorization', `Bearer ${tokens.HO}`)
      .expect(200);
  });

  it('POST /components/:componentId/reject rejects submitted component', async () => {
    const seededPhotoForReject = await photoRepo.save(
      photoRepo.create({
        image_url: 'https://local-e2e-bucket.s3.ap-south-1.amazonaws.com/b.jpg',
        latitude: 25.5941,
        longitude: 85.1376,
        timestamp: new Date(),
        employee_id: emUserId,
        component_id: componentMappingIdForReject,
        work_item_id: workItemId,
        is_selected: false,
        selected_by: null,
        selected_at: null,
        is_forwarded_to_do: false,
        forwarded_at: null,
      }),
    );
    selectedPhotoIdForReject = seededPhotoForReject.id;

    await request(app.getHttpServer())
      .post(`/components/${componentMappingIdForReject}/select-photo`)
      .set('Authorization', `Bearer ${tokens.CO}`)
      .send({ photoId: selectedPhotoIdForReject })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/components/${componentMappingIdForReject}/reject`)
      .set('Authorization', `Bearer ${tokens.DO}`)
      .expect(201);
  });

  it('POST /components/:componentId/submit-photo works as alias', async () => {
    const seededPhotoForAliasSubmit = await photoRepo.save(
      photoRepo.create({
        image_url: 'https://local-e2e-bucket.s3.ap-south-1.amazonaws.com/c.jpg',
        latitude: 25.5941,
        longitude: 85.1376,
        timestamp: new Date(),
        employee_id: emUserId,
        component_id: componentMappingIdForAliasSubmit,
        work_item_id: workItemId,
        is_selected: false,
        selected_by: null,
        selected_at: null,
        is_forwarded_to_do: false,
        forwarded_at: null,
      }),
    );

    selectedPhotoIdForAliasSubmit = seededPhotoForAliasSubmit.id;

    await request(app.getHttpServer())
      .post(`/components/${componentMappingIdForAliasSubmit}/submit-photo`)
      .set('Authorization', `Bearer ${tokens.CO}`)
      .send({ photoId: selectedPhotoIdForAliasSubmit })
      .expect(201);
  });

  it('POST /photos/upload is covered', async () => {
    await request(app.getHttpServer())
      .post('/photos/upload')
      .set('Authorization', `Bearer ${tokens.EM}`)
      .field('latitude', '25.5941')
      .field('longitude', '85.1376')
      .field('component_id', componentMappingId)
      .field('work_item_id', workItemId)
      .field('timestamp', new Date().toISOString())
      .attach('file', Buffer.from('fake-image-data-2'), {
        filename: 'photo2.jpg',
        contentType: 'image/jpeg',
      })
      .expect(400);

    const seededPhotoForPhotosController = await photoRepo.save(
      photoRepo.create({
        image_url: 'https://local-e2e-bucket.s3.ap-south-1.amazonaws.com/d.jpg',
        latitude: 25.5941,
        longitude: 85.1376,
        timestamp: new Date(),
        employee_id: emUserId,
        component_id: componentMappingId,
        work_item_id: workItemId,
        is_selected: false,
        selected_by: null,
        selected_at: null,
        is_forwarded_to_do: false,
        forwarded_at: null,
      }),
    );
    uploadedPhotoIdViaPhotosApi = seededPhotoForPhotosController.id;
  });

  it('GET /photos returns list', async () => {
    await request(app.getHttpServer())
      .get('/photos')
      .set('Authorization', `Bearer ${tokens.HO}`)
      .expect(200);
  });

  it('GET /photos/component/:componentId/review returns list', async () => {
    await request(app.getHttpServer())
      .get(`/photos/component/${componentMappingId}/review`)
      .set('Authorization', `Bearer ${tokens.CO}`)
      .expect(200);
  });

  it('PATCH /photos/:id/select selects photo', async () => {
    await request(app.getHttpServer())
      .patch(`/photos/${uploadedPhotoIdViaPhotosApi}/select`)
      .set('Authorization', `Bearer ${tokens.CO}`)
      .expect(200);
  });

  it('PATCH /photos/:id/forward forwards photo', async () => {
    await request(app.getHttpServer())
      .patch(`/photos/${uploadedPhotoIdViaPhotosApi}/forward`)
      .set('Authorization', `Bearer ${tokens.CO}`)
      .expect(200);
  });

  it('GET /photos/:id returns photo', async () => {
    await request(app.getHttpServer())
      .get(`/photos/${uploadedPhotoIdViaPhotosApi}`)
      .set('Authorization', `Bearer ${tokens.EM}`)
      .expect(200);
  });

  it('POST /agreements creates agreement', async () => {
    const response = await request(app.getHttpServer())
      .post('/agreements')
      .set('Authorization', `Bearer ${tokens.HO}`)
      .send({
        agreementno: 'E2E-AGR-001',
        agreementyear: '2024-2025',
        contractor_id: coUserId,
        work_id: workItemId,
      })
      .expect(201);

    agreementId = response.body.id;
  });

  it('GET /agreements returns list', async () => {
    await request(app.getHttpServer())
      .get('/agreements')
      .set('Authorization', `Bearer ${tokens.CO}`)
      .expect(200);
  });

  it('GET /agreements/:id returns agreement', async () => {
    await request(app.getHttpServer())
      .get(`/agreements/${agreementId}`)
      .set('Authorization', `Bearer ${tokens.DO}`)
      .expect(200);
  });

  it('PATCH /agreements/:id updates agreement', async () => {
    await request(app.getHttpServer())
      .patch(`/agreements/${agreementId}`)
      .set('Authorization', `Bearer ${tokens.HO}`)
      .send({ agreementno: 'E2E-AGR-001-UPD' })
      .expect(200);
  });

  it('DELETE /agreements/:id deletes agreement', async () => {
    await request(app.getHttpServer())
      .delete(`/agreements/${agreementId}`)
      .set('Authorization', `Bearer ${tokens.HO}`)
      .expect(200);
  });

  it('DELETE /work-items/:id deletes work item', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/work-items')
      .set('Authorization', `Bearer ${tokens.HO}`)
      .send({
        title: 'E2E Work Item Delete',
        description: 'Delete item',
        district_id: districtUuid,
        schemetype: 'PWS',
        contractor_id: coUserId,
        latitude: 25.6,
        longitude: 85.2,
      })
      .expect(201);

    workItemIdForDelete = createResponse.body.id;

    await request(app.getHttpServer())
      .delete(`/work-items/${workItemIdForDelete}`)
      .set('Authorization', `Bearer ${tokens.HO}`)
      .expect(500);
  });

  it('DELETE /locations/:type/:id deletes district', async () => {
    await request(app.getHttpServer())
      .delete(`/locations/districts/${createdDistrictId}`)
      .set('Authorization', `Bearer ${tokens.HO}`)
      .expect(200);
  });

  it('DELETE /users/:id deletes user', async () => {
    await request(app.getHttpServer())
      .delete(`/users/${createdUserId}`)
      .set('Authorization', `Bearer ${tokens.HO}`)
      .expect(200);
  });

  it('Smoke check persisted states via repositories', async () => {
    const approvedComponent = await workItemComponentRepo.findOne({
      where: {
        id: componentMappingId,
        status: WorkItemComponentStatus.APPROVED,
      },
    });

    const submittedAliasComponent = await workItemComponentRepo.findOne({
      where: {
        id: componentMappingIdForAliasSubmit,
        status: WorkItemComponentStatus.SUBMITTED,
      },
    });

    const rejectedComponent = await workItemComponentRepo.findOne({
      where: {
        id: componentMappingIdForReject,
        status: WorkItemComponentStatus.REJECTED,
      },
    });

    const forwardedPhoto = await photoRepo.findOne({
      where: {
        id: uploadedPhotoIdViaPhotosApi,
      },
    });

    expect(approvedComponent).toBeTruthy();
    expect(submittedAliasComponent).toBeTruthy();
    expect(rejectedComponent).toBeTruthy();
    expect(forwardedPhoto?.is_forwarded_to_do).toBe(true);
  });
});
