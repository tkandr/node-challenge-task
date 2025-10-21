export const makeDatabaseMock = (): { [key: string]: jest.Mock } => {
  const mockDb: any = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis(),
  };

  // Add transaction after mockDb is defined to avoid circular reference
  // Type the callback parameter to ensure the promise resolves to `unknown` instead of `any`.
  mockDb.transaction = jest.fn(
    async (callback: (db: any) => Promise<unknown>) => {
      return callback(mockDb); // No explicit await needed if outer fn is async and cb returns Promise
    },
  );

  return mockDb;
};
