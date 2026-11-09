-- ===========================================================================
-- 0. TẠO VÀ CHUYỂN SANG SCHEMA AVORA
-- ===========================================================================
CREATE SCHEMA IF NOT EXISTS avora;
SET search_path TO avora;


-- ===========================================================================
-- 1. NHÓM BẢNG TĨNH (SYSTEM)
-- ===========================================================================
CREATE TABLE m_system_code (
    business_cd VARCHAR(50) NOT NULL,
    code_cd VARCHAR(50) NOT NULL,
    code_name VARCHAR(255) NOT NULL,
    sort_no INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (business_cd, code_cd)
);

-- ===========================================================================
-- 2. NHÓM BẢNG QUẢN LÝ ĐỊA LÝ (Tạo trước để M_HOTEL tham chiếu)
-- ===========================================================================
CREATE TABLE m_city (
    city_id VARCHAR(50) PRIMARY KEY,
    city_name VARCHAR(255) NOT NULL
);

CREATE TABLE m_district (
    district_id VARCHAR(50) PRIMARY KEY,
    city_id VARCHAR(50) REFERENCES m_city(city_id),
    district_name VARCHAR(255) NOT NULL
);

CREATE TABLE m_ward (
    ward_id VARCHAR(50) PRIMARY KEY,
    district_id VARCHAR(50) REFERENCES m_district(district_id),
    ward_name VARCHAR(255) NOT NULL
);

-- ===========================================================================
-- 3. NHÓM BẢNG QUẢN LÝ THỰC THỂ
-- ===========================================================================
CREATE TABLE m_user (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    full_name VARCHAR(255),
    phone VARCHAR(20),
    role_cd VARCHAR(50), 
    is_email_verified BOOLEAN DEFAULT FALSE,
    account_status VARCHAR(50),
    avatar_url TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE m_hotel (
    hotel_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES m_user(user_id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    address TEXT,
    city_id VARCHAR(50) REFERENCES m_city(city_id),
    district_id VARCHAR(50) REFERENCES m_district(district_id),
    ward_id VARCHAR(50) REFERENCES m_ward(ward_id),
    star_rating NUMERIC(2,1),
    star_quality INT,
    lat NUMERIC(10, 7),
    lng NUMERIC(10, 7),
    hotel_status TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_hotel_location ON m_hotel(city_id, district_id);
CREATE INDEX idx_hotel_coordinates ON m_hotel(lat, lng);


CREATE TABLE m_hotel_image (
    image_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID REFERENCES m_hotel(hotel_id),
    is_thumbnail BOOLEAN DEFAULT FALSE,
    sort_order INT DEFAULT 0,
    image_url VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE m_facility (
    facility_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_name VARCHAR(255) NOT NULL,
    type VARCHAR(50),
    icon TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE m_hotel_facility_map (
    hotel_id UUID REFERENCES m_hotel(hotel_id),
    facility_id UUID REFERENCES m_facility(facility_id),
    PRIMARY KEY (hotel_id, facility_id)
);

CREATE TABLE m_room_type (
    room_type_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID REFERENCES m_hotel(hotel_id),
    type_name VARCHAR(255) NOT NULL,
    max_adults INT NOT NULL,
    max_children INT NOT NULL,
    bed_type VARCHAR(100),
    room_size VARCHAR(50),
    default_price NUMERIC(12,2) NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE m_room_facility_map (
    room_type_id UUID REFERENCES m_room_type(room_type_id),
    facility_id UUID REFERENCES m_facility(facility_id),
    PRIMARY KEY (room_type_id, facility_id)
);

CREATE TABLE m_room (
    room_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_type_id UUID REFERENCES m_room_type(room_type_id),
    hotel_id UUID REFERENCES m_hotel(hotel_id),
    room_number VARCHAR(50) NOT NULL,
    floor VARCHAR(50),
    status_cd VARCHAR(50),
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE m_commission_policy (
    policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_name VARCHAR(255),
    star_quality INT,
    hotel_id UUID REFERENCES m_hotel(hotel_id),
    commission_rate NUMERIC(5,2) NOT NULL,
    priority_level INT DEFAULT 0,
    valid_from DATE,
    valid_to DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE m_cancellation_policy (
    cancellation_policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID REFERENCES m_hotel(hotel_id),
    free_cancel_before_hours INT,
    penalty_rate NUMERIC(5,2),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE m_bank_account (
    bank_account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID REFERENCES m_hotel(hotel_id),
    bank_cd VARCHAR(50),
    bank_branch VARCHAR(255),
    bin_code VARCHAR(50),
    account_number VARCHAR(100) NOT NULL,
    account_holder VARCHAR(255) NOT NULL,
    is_verify BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE m_coupon (
    coupon_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_type VARCHAR(50),
    discount_value NUMERIC(12,2),
    max_discount_amount NUMERIC(12,2),
    min_order_amount NUMERIC(12,2),
    usage_limit INT,
    valid_from TIMESTAMP,
    valid_to TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_coupon_code ON m_coupon(code);

-- ===========================================================================
-- 4. NHÓM BẢNG QUẢN LÝ WISHLIST
-- ===========================================================================
CREATE TABLE t_wishlist (
    wishlist_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES m_user(user_id),
    hotel_id UUID REFERENCES m_hotel(hotel_id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ===========================================================================
-- 5. NHÓM BẢNG QUẢN LÝ GIAO DỊCH
-- ===========================================================================
CREATE TABLE t_inventory (
    inventory_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_type_id UUID REFERENCES m_room_type(room_type_id),
    target_date DATE NOT NULL,
    available_rooms INT NOT NULL DEFAULT 0,
    locked_rooms INT NOT NULL DEFAULT 0,
    current_price NUMERIC(12,2),
    version INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE UNIQUE INDEX uidx_inventory_room_date ON t_inventory (room_type_id, target_date);

CREATE TABLE t_booking (
    booking_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES m_user(user_id),
    hotel_id UUID REFERENCES m_hotel(hotel_id),
    total_amount NUMERIC(12,2) NOT NULL,
    guest_name VARCHAR(255),
    guest_phone VARCHAR(20),
    special_request TEXT,
    booking_status_cd VARCHAR(50),
    coupon_id UUID REFERENCES m_coupon(coupon_id),
    discount_amount NUMERIC(12,2),
    cancellation_policy_id UUID REFERENCES m_cancellation_policy(cancellation_policy_id),
    applied_penalty_rate NUMERIC(5,2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_booking_user ON t_booking(user_id, created_at);
CREATE INDEX idx_booking_hotel_status ON t_booking(hotel_id, booking_status_cd);

CREATE TABLE t_booking_detail (
    booking_detail_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES t_booking(booking_id),
    room_type_id UUID REFERENCES m_room_type(room_type_id),
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    quantity INT NOT NULL,
    unit_price NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE t_review (
    review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES t_booking(booking_id),
    rating_score INT CHECK (rating_score BETWEEN 1 AND 10),
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ===========================================================================
-- 6. NHÓM BẢNG QUẢN LÝ ĐỐI SOÁT TÀI CHÍNH
-- ===========================================================================
CREATE TABLE t_settlement (
    settlement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID UNIQUE REFERENCES t_booking(booking_id),
    hotel_id UUID REFERENCES m_hotel(hotel_id),
    total_amount_paid NUMERIC(12,2),
    applied_commission_rate NUMERIC(5,2),
    commission_amount NUMERIC(12,2),
    host_earnings NUMERIC(12,2),
    settlement_status_cd VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE t_hotel_wallet (
    wallet_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID UNIQUE REFERENCES m_hotel(hotel_id),
    pending_balance NUMERIC(12,2) DEFAULT 0,
    available_balance NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE t_withdrawal_request (
    withdrawal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES t_hotel_wallet(wallet_id),
    bank_account_id UUID REFERENCES m_bank_account(bank_account_id),
    amount NUMERIC(12,2) NOT NULL,
    status_cd VARCHAR(50),
    gateway_transaction_ref VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE t_wallet_ledger (
    ledger_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES t_hotel_wallet(wallet_id),
    transaction_type_cd VARCHAR(50),
    amount_change NUMERIC(12,2) NOT NULL,
    current_balance NUMERIC(12,2) NOT NULL,
    reference_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ===========================================================================
-- 7. NHÓM BẢNG QUẢN LÝ PAYMENT SHARING & HOÀN TIỀN
-- ===========================================================================
CREATE TABLE t_payment_transaction (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES t_booking(booking_id),
    payer_user_id UUID REFERENCES m_user(user_id),
    amount_paid NUMERIC(12,2) NOT NULL,
    payment_method_cd VARCHAR(50),
    gateway_ref_id VARCHAR(255),
    is_refunded BOOLEAN DEFAULT FALSE,
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE t_payment_sharing_group (
    group_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES t_booking(booking_id),
    total_required NUMERIC(12,2) NOT NULL,
    share_status_cd VARCHAR(50),
    payment_method_cd VARCHAR(50),
    invite_link_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE t_refund_request (
    refund_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES t_payment_transaction(transaction_id),
    booking_id UUID REFERENCES t_booking(booking_id),
    refund_amount NUMERIC(12,2) NOT NULL,
    refund_status_cd VARCHAR(50),
    gateway_refund_ref VARCHAR(255),
    reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ===========================================================================
-- 8. NHÓM BẢNG QUẢN LÝ VẬN HÀNH, DASHBOARD & AI
-- ===========================================================================
CREATE TABLE t_daily_statistics (
    stat_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID REFERENCES m_hotel(hotel_id),
    record_date DATE NOT NULL,
    total_revenue NUMERIC(12,2) DEFAULT 0,
    total_bookings INT DEFAULT 0,
    cancelled_bookings INT DEFAULT 0,
    total_views INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE h_user_behavior (
    behavior_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES m_user(user_id),
    action_type_cd VARCHAR(50),
    search_criteria JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE h_system_audit_log (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES m_user(user_id),
    action_cd VARCHAR(50),
    entity_name VARCHAR(100),
    entity_id VARCHAR(255),
    old_data JSONB,
    new_data JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ===========================================================================
-- 9. TICKET VÀ QUẢN LÝ TICKET (Lịch sử trao đổi / Chat)
-- ===========================================================================
CREATE TABLE t_support_ticket (
    ticket_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Các khóa ngoại liên kết thực thể
    requester_id UUID REFERENCES m_user(user_id) NOT NULL, -- Bắt buộc: Người tạo ticket (Khách hàng hoặc Vendor)
    hotel_id UUID REFERENCES m_hotel(hotel_id),            -- Không bắt buộc: Liên kết với khách sạn (Dành cho Vendor)
    booking_id UUID REFERENCES t_booking(booking_id),      -- Không bắt buộc: Liên kết với đơn hàng/thanh toán (Dành cho Khách)
    
    -- Phân loại và Trạng thái (Map với m_system_code)
    ticket_type_cd VARCHAR(50) NOT NULL,    -- Ví dụ: PAY_WRONG_CODE, VENDOR_BANK_UPDATE, REFUND_REQ
    ticket_status_cd VARCHAR(50) NOT NULL,  -- Ví dụ: OPEN, IN_PROGRESS, WAITING_USER_REPLY, RESOLVED, CLOSED
    priority_cd VARCHAR(50) DEFAULT 'MEDIUM', -- Mức độ ưu tiên: LOW, MEDIUM, HIGH, URGENT
    
    -- Nội dung chính
    title VARCHAR(255) NOT NULL,            -- Tiêu đề tóm tắt (VD: "Chuyển sai nội dung mã QR")
    description TEXT NOT NULL,              -- Nội dung chi tiết vấn đề
    attachment_urls JSONB,                  -- Mảng link ảnh/file bằng chứng (Bill ngân hàng, CCCD)
    
    -- Xử lý nghiệp vụ CSKH
    assigned_to UUID REFERENCES m_user(user_id), -- Admin đang thụ lý ticket này
    resolution_note TEXT,                   -- Ghi chú chốt lại vấn đề của Admin khi đóng ticket
    resolved_at TIMESTAMP,                  -- Thời điểm giải quyết xong
    
    -- Cờ hệ thống
    is_deleted BOOLEAN DEFAULT FALSE,       -- Xóa mềm (Soft delete)
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tạo Index để tối ưu tốc độ tìm kiếm và filter trên Dashboard
CREATE INDEX idx_ticket_requester ON t_support_ticket(requester_id);
CREATE INDEX idx_ticket_hotel ON t_support_ticket(hotel_id);
CREATE INDEX idx_ticket_booking ON t_support_ticket(booking_id);
CREATE INDEX idx_ticket_status_priority ON t_support_ticket(ticket_status_cd, priority_cd);
CREATE INDEX idx_ticket_assigned_to ON t_support_ticket(assigned_to);

CREATE TABLE t_support_ticket_reply (
    reply_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES t_support_ticket(ticket_id) ON DELETE CASCADE,
    sender_id UUID REFERENCES m_user(user_id) NOT NULL, -- Ai là người nhắn câu này (Khách, Vendor, hay Admin)
    
    message TEXT NOT NULL,                  -- Nội dung tin nhắn trả lời
    attachment_urls JSONB,                  -- File đính kèm bổ sung trong lúc chat
    
    is_internal_note BOOLEAN DEFAULT FALSE, -- đây là tin nhắn Admin note nội bộ cho nhau, Khách/Vendor không nhìn thấy
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tạo Index để load lịch sử chat nhanh nhất theo thứ tự thời gian
CREATE INDEX idx_ticket_reply_timeline ON t_support_ticket_reply(ticket_id, created_at);

-- ===========================================================================
-- FUNCTION & TRIGGER TỰ ĐỘNG CẬP NHẬT UPDATED_AT
-- ===========================================================================
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trg_update_ticket_modtime
BEFORE UPDATE ON t_support_ticket
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- ===========================================================================
-- DỮ LIỆU DANH MỤC SUPPORT TICKET
-- ===========================================================================

INSERT INTO m_system_code (business_cd, code_cd, code_name, sort_no) 
VALUES 
-- 1. SUPPORT_STS (Trạng thái Ticket)
('SUPPORT_STS', '1', 'OPN', 1), -- OPN: Open (Mới tạo)
('SUPPORT_STS', '2', 'INP', 2), -- INP: In Progress (Đang xử lý)
('SUPPORT_STS', '3', 'WAT', 3), -- WAT: Waiting (Chờ phản hồi)
('SUPPORT_STS', '4', 'RSV', 4), -- RSV: Resolved (Đã giải quyết)
('SUPPORT_STS', '5', 'CLS', 5), -- CLS: Closed (Đã đóng)

-- 2. SUPPORT_CAT (Phân loại Ticket)
-- Nhóm B2C: Khách hàng & Thanh toán
('SUPPORT_CAT', '1', 'PWC', 1), -- PWC: Pay Wrong Code (Sai cú pháp)
('SUPPORT_CAT', '2', 'PWA', 2), -- PWA: Pay Wrong Amount (Sai số tiền)
('SUPPORT_CAT', '3', 'PTO', 3), -- PTO: Pay Timeout (Thanh toán quá hạn)
('SUPPORT_CAT', '4', 'RFD', 4), -- RFD: Refund (Yêu cầu hoàn tiền)
('SUPPORT_CAT', '5', 'BKI', 5), -- BKI: Booking Issue (Vấn đề đơn hàng)

-- Nhóm B2B: Vendor / Đối tác khách sạn
('SUPPORT_CAT', '6', 'VBU', 6), -- VBU: Vendor Bank Update (Cập nhật ngân hàng)
('SUPPORT_CAT', '7', 'VIU', 7), -- VIU: Vendor Info Update (Cập nhật thông tin)
('SUPPORT_CAT', '8', 'VPO', 8), -- VPO: Vendor Policy (Hỏi về chính sách/hoa hồng)

-- Nhóm Chung
('SUPPORT_CAT', '9', 'GEN', 9)  -- GEN: General (Thông tin chung/Khác)