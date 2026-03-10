import { bigIntUtils } from '@hathor/wallet-lib';
import { handleMessage, loadPlugins } from '../../src/plugins/child';
import { notificationBus, EVENTBUS_EVENT_NAME } from '../../src/services/notification.service';
import * as loggerModule from '../../src/logger';

jest.mock('../../src/services/notification.service', () => ({
  notificationBus: {
    emit: jest.fn(),
  },
  EVENTBUS_EVENT_NAME: 'eventbus_event',
}));

describe('loadPlugins', () => {
  it('should warn and skip unknown plugins', async () => {
    const mockWarn = jest.fn();
    jest.spyOn(loggerModule, 'buildAppLogger').mockReturnValue({ warn: mockWarn });

    const plugins = await loadPlugins(['nonexistent_plugin'], {});

    expect(mockWarn).toHaveBeenCalledWith('Unable to find plugin nonexistent_plugin, skipping.');
    expect(plugins).toEqual([]);
  });

  it('should load known hathor plugins', async () => {
    const plugins = await loadPlugins(['debug'], {});

    expect(plugins).toHaveLength(1);
    expect(plugins[0]).toHaveProperty('eventHandler');
  });

  it('should load custom plugins from config', async () => {
    const plugins = await loadPlugins(['my_plugin'], {
      my_plugin: { name: 'debug', file: 'hathor_debug.js' },
    });

    expect(plugins).toHaveLength(1);
    expect(plugins[0]).toHaveProperty('eventHandler');
  });
});

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
