-- ===========================================================================
-- AVORA - TẠO BẢNG CHÍNH SÁCH HOÀN TIỀN (m_refund_policy)
-- Dành cho phân hệ Quản lý Doanh thu & Chính sách (Business Manager)
-- Chạy file này trong Supabase Dashboard -> SQL Editor (nếu muốn dùng bảng riêng)
-- ===========================================================================

SET search_path TO avora;

CREATE TABLE IF NOT EXISTS avora.m_refund_policy (
    policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_code VARCHAR(50) UNIQUE,
    policy_name VARCHAR(255) NOT NULL,
    description TEXT,
    refund_conditions TEXT,
    refund_percentage NUMERIC(5,2) NOT NULL CHECK (refund_percentage BETWEEN 0 AND 100),
    minimum_cancellation_hours INT NOT NULL CHECK (minimum_cancellation_hours >= 0),
    hotel_id UUID REFERENCES avora.m_hotel(hotel_id) ON DELETE SET NULL,
    effective_from TIMESTAMP,
    effective_to TIMESTAMP,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index tìm kiếm & hiệu suất
CREATE INDEX IF NOT EXISTS idx_refund_policy_hotel ON avora.m_refund_policy(hotel_id);
CREATE INDEX IF NOT EXISTS idx_refund_policy_status ON avora.m_refund_policy(status, is_active, is_deleted);
CREATE INDEX IF NOT EXISTS idx_refund_policy_is_active ON avora.m_refund_policy(is_active);
CREATE INDEX IF NOT EXISTS idx_refund_policy_code ON avora.m_refund_policy(policy_code);

COMMENT ON TABLE avora.m_refund_policy IS 'Bảng lưu trữ chính sách hoàn tiền dành cho Business Manager quản trị';
