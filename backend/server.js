/**
 * 로컬 개발용 Express 서버
 * DB(PostgreSQL) 연결 예시 포함
 */
import express from 'express';
import helmet from 'helmet';
import pg from 'pg';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import { readFileSync } from 'node:fs';
import logger from './logger.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(helmet());

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '너무 많은 요청이에요. 잠시 후 다시 시도해주세요' },
  handler: (req, res, next, options) => {
    logger.warn({ ip: req.ip, path: req.path }, 'rate limit exceeded (general)');
    res.status(options.statusCode).json(options.message);
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '너무 많은 요청이에요. 잠시 후 다시 시도해주세요' },
  handler: (req, res, next, options) => {
    logger.warn({ ip: req.ip, path: req.path }, 'rate limit exceeded (auth)');
    res.status(options.statusCode).json(options.message);
  },
});

app.use(generalLimiter);

// 로컬 프론트엔드(Vite)에서 API 호출 허용
app.use((req, res, next) => {
  const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:5174';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// DB 연결 (선택: 나중에 API 만들 때 사용)
const pool = process.env.DATABASE_URL
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL })
  : null;

app.use(express.json());

// ── Phase 2-1: 영화 데이터 로드 ──
const filmsData = JSON.parse(
  readFileSync(process.env.FILMS_JSON_PATH || '../films_embedded.json', 'utf-8')
);

// ── Auth helper ──
async function requireAdmin(req, res) {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  const password = req.body?.password;
  if (!hash || !password) {
    logger.warn({ ip: req.ip, path: req.path }, 'auth failed: missing credentials');
    res.status(401).json({ error: '비밀번호가 틀렸어요' });
    return false;
  }
  const match = await bcrypt.compare(password, hash);
  if (!match) {
    logger.warn({ ip: req.ip, path: req.path }, 'auth failed: wrong password');
    res.status(401).json({ error: '비밀번호가 틀렸어요' });
    return false;
  }
  return true;
}

// 개발 전용 엔드포인트 가드
function devOnly(req, res, next) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  next();
}

// 헬스체크
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'trace-backend' });
});

// 프론트 호환: /api/health 기대 경로 지원
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'trace-backend' });
});

// Spec.me: DB client confirms schema is present (tables exist)
app.get('/api/schema-check', devOnly, async (req, res) => {
  if (!pool) {
    return res.status(503).json({ ok: false, error: 'DB not configured' });
  }
  try {
    const { rows } = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN ('users', 'reviews', 'comments')
      ORDER BY table_name
    `);
    const tables = rows.map((r) => r.table_name);
    const ok = tables.length === 3;
    res.json({ ok, tables });
  } catch (e) {
    logger.error({ ip: req.ip, path: req.path, err: e.message }, 'server error');
    res.status(500).json({
      ok: false,
      error: '서버 오류가 발생했어요',
      ...(process.env.NODE_ENV !== 'production' && { detail: e.message }),
    });
  }
});

// Spec.me: insert one User row for validation; returns the row
app.post('/api/dev/seed-one-user', devOnly, async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'DB not configured' });
  }
  try {
    const identifier = req.body?.identifier ?? `dev-${Date.now()}@trace.local`;
    const { rows } = await pool.query(
      'INSERT INTO users (identifier) VALUES ($1) RETURNING id, identifier, created_at',
      [identifier]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    logger.error({ ip: req.ip, path: req.path, err: e.message }, 'server error');
    res.status(500).json({
      error: '서버 오류가 발생했어요',
      ...(process.env.NODE_ENV !== 'production' && { detail: e.message }),
    });
  }
});

// ── Reviews API ──

// GET /api/reviews — 전체 감상평 조회
app.get('/api/reviews', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'DB not configured' });
  try {
    const { rows } = await pool.query(
      'SELECT * FROM reviews ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (e) {
    logger.error({ ip: req.ip, path: req.path, err: e.message }, 'server error');
    res.status(500).json({
      error: '서버 오류가 발생했어요',
      ...(process.env.NODE_ENV !== 'production' && { detail: e.message }),
    });
  }
});

// GET /api/reviews/:film_title_en — 특정 영화 감상평 + 댓글
app.get('/api/reviews/:film_title_en', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'DB not configured' });
  try {
    const { rows: reviews } = await pool.query(
      'SELECT * FROM reviews WHERE film_title_en = $1',
      [req.params.film_title_en]
    );
    if (reviews.length === 0) return res.json({ review: null, comments: [] });

    const { rows: comments } = await pool.query(
      'SELECT * FROM comments WHERE review_id = $1 ORDER BY created_at ASC',
      [reviews[0].id]
    );
    res.json({ review: reviews[0], comments });
  } catch (e) {
    logger.error({ ip: req.ip, path: req.path, err: e.message }, 'server error');
    res.status(500).json({
      error: '서버 오류가 발생했어요',
      ...(process.env.NODE_ENV !== 'production' && { detail: e.message }),
    });
  }
});

// POST /api/reviews — 감상평 작성 (비밀번호 인증)
app.post('/api/reviews', authLimiter, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'DB not configured' });
  const { film_title_en, content, password } = req.body;
  const authed = await requireAdmin(req, res);
  if (!authed) return;
  logger.info({ ip: req.ip, path: req.path }, 'auth success: review create');
  if (!film_title_en || !content) {
    return res.status(400).json({ error: 'film_title_en과 content가 필요해요' });
  }
  try {
    const { rows } = await pool.query(
      'INSERT INTO reviews (film_title_en, content) VALUES ($1, $2) RETURNING *',
      [film_title_en, content]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') {
      return res.status(409).json({ error: '이미 감상평이 있어요. 수정하려면 PUT을 사용하세요' });
    }
    logger.error({ ip: req.ip, path: req.path, err: e.message }, 'server error');
    res.status(500).json({
      error: '서버 오류가 발생했어요',
      ...(process.env.NODE_ENV !== 'production' && { detail: e.message }),
    });
  }
});

// PUT /api/reviews/:id — 감상평 수정 (숫자 ID만)
app.put('/api/reviews/:id(\\d+)', authLimiter, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'DB not configured' });
  const { content, password } = req.body;
  const authed = await requireAdmin(req, res);
  if (!authed) return;
  logger.info({ ip: req.ip, path: req.path }, 'auth success: review update');
  try {
    const { rows } = await pool.query(
      'UPDATE reviews SET content = $1, updated_at = now() WHERE id = $2 RETURNING *',
      [content, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: '감상평을 찾을 수 없어요' });
    res.json(rows[0]);
  } catch (e) {
    logger.error({ ip: req.ip, path: req.path, err: e.message }, 'server error');
    res.status(500).json({
      error: '서버 오류가 발생했어요',
      ...(process.env.NODE_ENV !== 'production' && { detail: e.message }),
    });
  }
});

// POST /api/reviews/:id/comments — 댓글 작성
app.post('/api/reviews/:id/comments', authLimiter, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'DB not configured' });
  const { author_thread_id, body, password } = req.body;
  const authed = await requireAdmin(req, res);
  if (!authed) return;
  logger.info({ ip: req.ip, path: req.path, author: author_thread_id }, 'auth success: comment create');
  if (!author_thread_id || !body) {
    return res.status(400).json({ error: 'author_thread_id와 body가 필요해요' });
  }
  try {
    const { rows } = await pool.query(
      'INSERT INTO comments (review_id, author_thread_id, body) VALUES ($1, $2, $3) RETURNING *',
      [req.params.id, author_thread_id, body]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    logger.error({ ip: req.ip, path: req.path, err: e.message }, 'server error');
    res.status(500).json({
      error: '서버 오류가 발생했어요',
      ...(process.env.NODE_ENV !== 'production' && { detail: e.message }),
    });
  }
});

// ── Phase 2-1: Films + Progress + UPSERT ──

// GET /api/films — 전체 영화 + 내 상태
app.get('/api/films', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'DB not configured' });
  try {
    const { rows } = await pool.query(
      'SELECT film_title_en, status, content FROM reviews'
    );
    const reviewMap = new Map(rows.map(r => [r.film_title_en, r]));
    const films = filmsData.map(f => ({
      ...f,
      status: reviewMap.get(f.title_en)?.status ?? 'unwatched',
      content: reviewMap.get(f.title_en)?.content ?? null,
    }));
    res.json({ films });
  } catch (e) {
    logger.error({ ip: req.ip, path: req.path, err: e.message }, 'server error');
    res.status(500).json({
      error: '서버 오류가 발생했어요',
      ...(process.env.NODE_ENV !== 'production' && { detail: e.message }),
    });
  }
});

// GET /api/progress — 진행률 통계
app.get('/api/progress', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'DB not configured' });
  try {
    const { rows } = await pool.query(
      "SELECT status, COUNT(*)::int AS count FROM reviews WHERE status IN ('watched', 'watching') GROUP BY status"
    );
    const counts = Object.fromEntries(rows.map(r => [r.status, r.count]));
    const total = filmsData.length;
    const watched = counts.watched ?? 0;
    const watching = counts.watching ?? 0;
    res.json({ total, watched, watching, unwatched: total - watched - watching });
  } catch (e) {
    logger.error({ ip: req.ip, path: req.path, err: e.message }, 'server error');
    res.status(500).json({
      error: '서버 오류가 발생했어요',
      ...(process.env.NODE_ENV !== 'production' && { detail: e.message }),
    });
  }
});

// PUT /api/reviews/:film_title_en — 상태/감상평 UPSERT
app.put('/api/reviews/:film_title_en', authLimiter, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'DB not configured' });
  const authed = await requireAdmin(req, res);
  if (!authed) return;

  const filmTitle = decodeURIComponent(req.params.film_title_en);
  const { status } = req.body;

  if (!status || !['unwatched', 'watching', 'watched'].includes(status)) {
    return res.status(400).json({ error: "status는 'unwatched', 'watching', 'watched' 중 하나여야 해요" });
  }

  // content 규칙: 생략 → null (INSERT시 null, UPDATE시 기존 유지 via COALESCE)
  const contentParam = 'content' in req.body ? req.body.content : null;

  try {
    const { rows } = await pool.query(
      `INSERT INTO reviews (film_title_en, status, content)
       VALUES ($1, $2, $3)
       ON CONFLICT (film_title_en) DO UPDATE SET
         status = EXCLUDED.status,
         content = COALESCE(EXCLUDED.content, reviews.content),
         updated_at = now()
       RETURNING film_title_en, status, content, updated_at`,
      [filmTitle, status, contentParam]
    );
    logger.info({ ip: req.ip, film: filmTitle, status }, 'review upserted');
    res.json({ review: rows[0] });
  } catch (e) {
    logger.error({ ip: req.ip, path: req.path, err: e.message }, 'server error');
    res.status(500).json({
      error: '서버 오류가 발생했어요',
      ...(process.env.NODE_ENV !== 'production' && { detail: e.message }),
    });
  }
});

app.listen(port, '0.0.0.0', () => {
  logger.info({ port }, 'backend listening');
});
