import { swapService } from '@hathor/wallet-lib';
import { serviceCreate, serviceGet, serviceUpdate } from '../../src/services/atomic-swap.service';

const walletId = 'mock-wallet';

describe('serviceCreate', () => {
  it('should reject empty proposals', async () => {
    await expect(serviceCreate(walletId, '', 'abc'))
      .rejects.toThrow('Invalid PartialTx');
  });

  it('should reject invalid passwords', async () => {
    await expect(serviceCreate(walletId, 'PartialTx||', 'ab'))
      .rejects.toThrow('Password must have at least 3 characters');
  });

  it('should rethrow errors from the lib', async () => {
    const mockLib = jest.spyOn(swapService, 'create')
      .mockImplementationOnce(async () => {
        throw new Error('Unexpected lib error');
      });

    await expect(serviceCreate(walletId, 'PartialTx||', 'abc'))
      .rejects.toThrow('Unexpected lib error');

    mockLib.mockRestore();
  });

  it('should throw if there is no success in the operation', async () => {
    const mockLib = jest.spyOn(swapService, 'create')
      .mockImplementationOnce(async () => ({ success: false }));

    await expect(serviceCreate(walletId, 'PartialTx||', 'abc'))
      .rejects.toThrow('Unable to create the proposal on the Atomic Swap Service');

    mockLib.mockRestore();
  });

  it('should return the proposal id', async () => {
    const mockLib = jest.spyOn(swapService, 'create')
      .mockImplementationOnce(async () => ({ success: true, id: 'abc' }));

    const result = await serviceCreate(walletId, 'PartialTx||', 'abc');
    expect(result).toStrictEqual({ proposalId: 'abc' });

    mockLib.mockRestore();
  });
});

describe('serviceGet', () => {
  it('should reject missing mandatory parameters', async () => {
    await expect(serviceGet('', 'abc'))
      .rejects.toThrow('Invalid proposalId');

    await expect(serviceGet('1a574e6c-7329-4adc-b98c-b70fb20ef919'))
      .rejects.toThrow('Invalid password');
  });

  it('should reject on empty results from the service backend', async () => {
    const mockLib = jest.spyOn(swapService, 'get')
      .mockImplementationOnce(async () => null);

    await expect(serviceGet('1a574e6c-7329-4adc-b98c-b70fb20ef919', 'abc'))
      .rejects.toThrow('Unable to fetch the proposal from the Atomic Swap Service');

    mockLib.mockRestore();
  });

  it('should return the backend proposal on success', async () => {
    const expectedProposal = { id: 'fakeId', partialTx: 'fakePartialTx' };
    const mockLib = jest.spyOn(swapService, 'get')
      .mockImplementationOnce(async () => expectedProposal);

    const results = await serviceGet('1a574e6c-7329-4adc-b98c-b70fb20ef919', 'abc');
    expect(results).toStrictEqual(expectedProposal);

    mockLib.mockRestore();
  });
});

describe('serviceUpdate', () => {
  it('should reject missing mandatory parameters', async () => {
    await expect(serviceUpdate({}))
      .rejects.toThrow('Missing PartialTx');

    await expect(serviceUpdate({ partialTx: 'abc' }))
      .rejects.toThrow('Missing password');
  });

  it('should reject on empty results from the service backend', async () => {
    const mockLib = jest.spyOn(swapService, 'update')
      .mockResolvedValue({});

    await expect(serviceUpdate({
      partialTx: '1a574e6c-7329-4adc-b98c-b70fb20ef919',
      password: 'abc',
    }))
      .rejects.toThrow('Unable to update the proposal on the Atomic Swap Service');

    mockLib.mockRestore();
  });

  it('should not throw on backend success', async () => {
    const expectedResponse = { success: true };
    const mockLib = jest.spyOn(swapService, 'update')
      .mockResolvedValue(expectedResponse);

    const results = await serviceUpdate({
      partialTx: '1a574e6c-7329-4adc-b98c-b70fb20ef919',
      password: 'abc',
    });
    expect(results).toBeUndefined();

    mockLib.mockRestore();
  });
});
