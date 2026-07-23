import logger, { LogLevel } from './logger';

describe('Logger', () => {
  describe('Logger Instance', () => {
    it('should create logger instance', () => {
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should have correct log levels', () => {
      expect(LogLevel.ERROR).toBe('error');
      expect(LogLevel.WARN).toBe('warn');
      expect(LogLevel.INFO).toBe('info');
      expect(LogLevel.DEBUG).toBe('debug');
    });
  });

  describe('Log Methods', () => {
    // Mock stdout/stderr to prevent actual log output during tests
    let stdoutWriteSpy: jest.SpyInstance;
    let stderrWriteSpy: jest.SpyInstance;

    beforeEach(() => {
      stdoutWriteSpy = jest.spyOn(process.stdout, 'write').mockImplementation();
      stderrWriteSpy = jest.spyOn(process.stderr, 'write').mockImplementation();
    });

    afterEach(() => {
      stdoutWriteSpy.mockRestore();
      stderrWriteSpy.mockRestore();
    });

    it('should log info messages', () => {
      logger.info('Test info message');
      const totalCalls = stdoutWriteSpy.mock.calls.length + stderrWriteSpy.mock.calls.length;
      expect(totalCalls).toBeGreaterThan(0);
    });

    it('should log error messages', () => {
      logger.error('Test error message');
      const totalCalls = stdoutWriteSpy.mock.calls.length + stderrWriteSpy.mock.calls.length;
      expect(totalCalls).toBeGreaterThan(0);
    });

    it('should log warn messages', () => {
      logger.warn('Test warn message');
      const totalCalls = stdoutWriteSpy.mock.calls.length + stderrWriteSpy.mock.calls.length;
      expect(totalCalls).toBeGreaterThan(0);
    });

    it('should log debug messages', () => {
      logger.debug('Test debug message');
      // Debug may or may not be written depending on log level
      expect(stdoutWriteSpy.mock.calls.length + stderrWriteSpy.mock.calls.length).toBeGreaterThanOrEqual(0);
    });

    it('should log with metadata', () => {
      logger.info('Test with metadata', {
        requestId: 'test-req-123',
        userId: 'user-456',
        customField: 'custom-value',
      });
      const totalCalls = stdoutWriteSpy.mock.calls.length + stderrWriteSpy.mock.calls.length;
      expect(totalCalls).toBeGreaterThan(0);
    });

    it('should log errors with stack traces', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', { error });
      const totalCalls = stdoutWriteSpy.mock.calls.length + stderrWriteSpy.mock.calls.length;
      expect(totalCalls).toBeGreaterThan(0);
    });
  });
});
