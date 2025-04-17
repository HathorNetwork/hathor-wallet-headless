import { bigIntUtils } from '@hathor/wallet-lib';
import { handleMessage } from '../../src/plugins/child';
import { notificationBus, EVENTBUS_EVENT_NAME } from '../../src/services/notification.service';

jest.mock('../../src/services/notification.service', () => ({
  notificationBus: {
    emit: jest.fn(),
  },
  EVENTBUS_EVENT_NAME: 'eventbus_event',
}));

describe('handleMessage', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should parse the serialized data and emit the eventbus event', () => {
    const mockData = { type: 'custom_event', payload: 'test', bigint: BigInt(Number.MAX_SAFE_INTEGER) + 1n };

    handleMessage(bigIntUtils.JSONBigInt.stringify(mockData));

    expect(notificationBus.emit).toHaveBeenCalledWith(EVENTBUS_EVENT_NAME, mockData);
  });

  it('should emit the specific event type if present in the data', () => {
    const mockData = { type: 'custom_event', payload: 'test', bigint: BigInt(Number.MAX_SAFE_INTEGER) + 1n };

    handleMessage(bigIntUtils.JSONBigInt.stringify(mockData));

    expect(notificationBus.emit).toHaveBeenCalledWith(mockData.type, mockData);
  });

  it('should not emit a specific event type if type is not present in the data', () => {
    const mockData = { payload: 'test', bigint: BigInt(Number.MAX_SAFE_INTEGER) + 1n };

    handleMessage(bigIntUtils.JSONBigInt.stringify(mockData));

    expect(notificationBus.emit).not.toHaveBeenCalledWith(mockData.type, mockData);
  });
});
