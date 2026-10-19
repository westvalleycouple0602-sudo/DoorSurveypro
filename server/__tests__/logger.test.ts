import { logger, logError } from '../logger';
describe('unknown error logging', () => {
  afterEach(() => jest.restoreAllMocks());
  it('preserves Error details and structured context', () => {
    const spy = jest.spyOn(logger, 'error').mockReturnValue(logger);
    const error = new TypeError('Invalid input');
    logError(error, { operation: 'test' });
    expect(spy).toHaveBeenCalledWith('Application error', { error: { message: error.message, name: 'TypeError', stack: error.stack }, operation: 'test' });
  });
  it.each(['offline', null, undefined, 42])('handles a non-Error thrown value: %s', (value) => {
    const spy = jest.spyOn(logger, 'error').mockReturnValue(logger);
    logError(value);
    expect(spy).toHaveBeenCalledWith('Application error', { error: expect.objectContaining({ message: String(value), name: 'Error' }) });
  });
});
