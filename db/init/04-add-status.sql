-- Phase 2-1: 상태 추적 기능 추가
-- 기존 볼륨이 있으므로 자동 실행되지 않음 → DBeaver에서 수동 실행 필요

-- 1) content를 NULL 허용으로 변경 (status만 바꿀 때 content 없이 INSERT 가능)
ALTER TABLE reviews ALTER COLUMN content DROP NOT NULL;

-- 2) status 컬럼 추가
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'unwatched';
