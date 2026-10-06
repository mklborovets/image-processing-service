import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('ImagesController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/images/upload-url (POST) - validation fails for bad mimeType', () => {
    return request(app.getHttpServer())
      .post('/images/upload-url')
      .send({ fileName: 'test.pdf', mimeType: 'application/pdf', size: 100 })
      .expect(400);
  });

  it('/images/upload-url (POST) - validation fails for size > 5MB', () => {
    return request(app.getHttpServer())
      .post('/images/upload-url')
      .send({ fileName: 'test.jpg', mimeType: 'image/jpeg', size: 6000000 })
      .expect(400);
  });

  it('/images/upload-url (POST) - success', async () => {
    const res = await request(app.getHttpServer())
      .post('/images/upload-url')
      .send({ fileName: 'test.jpg', mimeType: 'image/jpeg', size: 1024 })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.uploadUrl).toBeDefined();
    expect(res.body.fields).toBeDefined();
  });
});
