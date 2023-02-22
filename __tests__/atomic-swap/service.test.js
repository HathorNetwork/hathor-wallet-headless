import { swapService } from '@hathor/wallet-lib';
import { serviceCreate } from '../../src/services/atomic-swap.service';

describe('serviceCreate', () => {
  it('should reject empty proposals', async () => {
    await expect(serviceCreate('', 'abc'))
      .rejects.toThrow('Invalid PartialTx');
  });

  it('should reject invalid passwords', async () => {
    await expect(serviceCreate('PartialTx||', 'ab'))
      .rejects.toThrow('Password must have at least 3 characters');
  });

  it('should rethrow errors from the lib', async () => {
    const mockLib = jest.spyOn(swapService, 'create')
      .mockImplementationOnce(async () => {
        throw new Error('Unexpected lib error');
      });

    await expect(serviceCreate('PartialTx||', 'abc'))
      .rejects.toThrow('Unexpected lib error');

    mockLib.mockRestore();
  });

  it('should throw if there is no success in the operation', async () => {
    const mockLib = jest.spyOn(swapService, 'create')
      .mockImplementationOnce(async () => ({ success: false }));

    await expect(serviceCreate('PartialTx||', 'abc'))
      .rejects.toThrow('Unable to create the proposal on the Atomic Swap Service');

    mockLib.mockRestore();
  });

  it('should return the proposal id', async () => {
    const mockLib = jest.spyOn(swapService, 'create')
      .mockImplementationOnce(async () => ({ success: true, id: 'abc' }));

    const result = await serviceCreate('PartialTx||', 'abc');
    expect(result).toStrictEqual({ proposalId: 'abc' });

    mockLib.mockRestore();
  });
});
