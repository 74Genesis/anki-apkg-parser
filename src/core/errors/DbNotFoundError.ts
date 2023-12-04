export default class DbNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DbNotFoundError';
  }
}
