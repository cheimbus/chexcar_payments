import { Test, TestingModule } from '@nestjs/testing';
import { IamportController } from './iamport.controller';

describe('IamportController', () => {
  let controller: IamportController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IamportController],
    }).compile();

    controller = module.get<IamportController>(IamportController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
