import { Test, TestingModule } from '@nestjs/testing';
import { IamportService } from './iamport.service';

describe('IamportService', () => {
  let service: IamportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IamportService],
    }).compile();

    service = module.get<IamportService>(IamportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
