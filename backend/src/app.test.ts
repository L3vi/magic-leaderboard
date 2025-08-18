import request from 'supertest';
import app from './app';

describe('GET /', () => {
  it('should return API running message', async () => {
    const res = await request(app).get('/');
    expect(res.text).toContain('Magic Leaderboard API is running');
    expect(res.status).toBe(200);
  });
});
