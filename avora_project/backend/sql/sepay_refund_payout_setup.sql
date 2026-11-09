-- ===========================================================================
-- AVORA - SePay VietQR Customer Refund Payout (Hoàn tiền khách hàng - AVRRF)
-- Chạy file này trong Supabase SQL Editor / PostgreSQL (schema avora).
-- Idempotent: có thể chạy lại nhiều lần an toàn.
-- ===========================================================================
SET search_path TO avora;

-- 1. Bổ sung các cột quản lý STK thụ hưởng, liên kết Ticket và đối soát SePay cho t_refund_request
ALTER TABLE avora.t_refund_request
    ADD COLUMN IF NOT EXISTS ticket_id            UUID REFERENCES avora.t_support_ticket(ticket_id),
    ADD COLUMN IF NOT EXISTS requester_id         UUID REFERENCES avora.m_user(user_id),
    ADD COLUMN IF NOT EXISTS bank_cd              VARCHAR(50),
    ADD COLUMN IF NOT EXISTS account_number       VARCHAR(100),
    ADD COLUMN IF NOT EXISTS account_holder       VARCHAR(255),
    ADD COLUMN IF NOT EXISTS payment_code         VARCHAR(30),   -- AVRRFxxxxxxxx (memo chuyển khoản hoàn tiền)
    ADD COLUMN IF NOT EXISTS paid_at              TIMESTAMP,     -- thời điểm hoàn tiền thành công
    ADD COLUMN IF NOT EXISTS settlement_source    VARCHAR(20),   -- SEPAY | MANUAL
    ADD COLUMN IF NOT EXISTS sepay_transaction_id VARCHAR(64),   -- id giao dịch SePay (chống trùng / đối soát)
    ADD COLUMN IF NOT EXISTS settled_by           UUID REFERENCES avora.m_user(user_id);

-- 2. Đảm bảo mỗi payment_code (AVRRFxxxxxxxx) và mỗi ticket_id chỉ gắn tối đa 1 lệnh hoàn tiền
CREATE UNIQUE INDEX IF NOT EXISTS uidx_refund_request_payment_code
    ON avora.t_refund_request (payment_code)
    WHERE payment_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_refund_request_ticket_id
    ON avora.t_refund_request (ticket_id)
    WHERE ticket_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_refund_request_status_created
    ON avora.t_refund_request (refund_status_cd, created_at DESC);

-- 3. Hàm xử lý webhook SePay (tiền RA - transferType = 'out') cho mã AVRRFxxxxxxxx
--    Chạy atomic toàn bộ trong 1 transaction.
CREATE OR REPLACE FUNCTION avora.fn_process_sepay_refund_payout(
    p_payment_code    TEXT,
    p_transfer_amount NUMERIC,
    p_gateway_ref     TEXT,
    p_sepay_tx_id     TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = avora, public
AS $$
DECLARE
    v_req   avora.t_refund_request%ROWTYPE;
    v_pnd   TEXT;
    v_pro   TEXT;
    v_suc   TEXT;
    v_now   TIMESTAMP := now()::timestamp;
    v_ref   TEXT;
BEGIN
    SELECT code_cd INTO v_pnd FROM avora.m_system_code WHERE business_cd = 'REFUND_STS' AND upper(code_name) = 'PND' LIMIT 1;
    SELECT code_cd INTO v_pro FROM avora.m_system_code WHERE business_cd = 'REFUND_STS' AND upper(code_name) = 'PRO' LIMIT 1;
    SELECT code_cd INTO v_suc FROM avora.m_system_code WHERE business_cd = 'REFUND_STS' AND upper(code_name) = 'SUC' LIMIT 1;

    -- Khóa dòng yêu cầu hoàn tiền theo mã AVRRF...
    SELECT * INTO v_req
      FROM avora.t_refund_request
     WHERE payment_code = upper(p_payment_code)
     FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('result', 'NOT_FOUND');
    END IF;

    -- Nếu đã hoàn tất trước đó
    IF v_req.refund_status_cd = v_suc THEN
        IF p_sepay_tx_id IS NULL
           OR v_req.sepay_transaction_id IS NULL
           OR v_req.sepay_transaction_id = p_sepay_tx_id THEN
            RETURN jsonb_build_object('result', 'ALREADY_SETTLED', 'refund_id', v_req.refund_id);
        END IF;
        RETURN jsonb_build_object(
            'result', 'DUPLICATE_PAYOUT',
            'refund_id', v_req.refund_id,
            'received', p_transfer_amount
        );
    END IF;

    -- Chỉ chấp nhận lệnh đang ở trạng thái Chờ xử lý (PND) hoặc Đang xử lý (PRO)
    IF v_req.refund_status_cd IS DISTINCT FROM v_pnd
       AND (v_pro IS NULL OR v_req.refund_status_cd IS DISTINCT FROM v_pro) THEN
        RETURN jsonb_build_object(
            'result', 'INVALID_STATUS',
            'refund_id', v_req.refund_id,
            'refund_status_cd', v_req.refund_status_cd
        );
    END IF;

    -- Số tiền chi ra phải KHỚP CHÍNH XÁC với refund_amount
    IF p_transfer_amount IS DISTINCT FROM v_req.refund_amount THEN
        RETURN jsonb_build_object(
            'result', 'AMOUNT_MISMATCH',
            'refund_id', v_req.refund_id,
            'expected', v_req.refund_amount,
            'received', p_transfer_amount
        );
    END IF;

    v_ref := COALESCE(NULLIF(trim(p_gateway_ref), ''), 'SEPAY-' || COALESCE(p_sepay_tx_id, upper(p_payment_code)));

    UPDATE avora.t_refund_request
       SET refund_status_cd     = v_suc,
           gateway_refund_ref   = v_ref,
           paid_at              = v_now,
           settlement_source    = 'SEPAY',
           sepay_transaction_id = p_sepay_tx_id,
           updated_at           = v_now
     WHERE refund_id = v_req.refund_id;

    -- Đánh dấu giao dịch gốc (hoặc các giao dịch của booking) là đã hoàn tiền
    IF v_req.transaction_id IS NOT NULL THEN
        UPDATE avora.t_payment_transaction
           SET is_refunded = TRUE,
               updated_at  = v_now
         WHERE transaction_id = v_req.transaction_id;
    ELSIF v_req.booking_id IS NOT NULL THEN
        UPDATE avora.t_payment_transaction
           SET is_refunded = TRUE,
               updated_at  = v_now
         WHERE booking_id = v_req.booking_id
           AND paid_at IS NOT NULL;
    END IF;

    RETURN jsonb_build_object(
        'result', 'SETTLED',
        'refund_id', v_req.refund_id,
        'booking_id', v_req.booking_id,
        'ticket_id', v_req.ticket_id,
        'gateway_refund_ref', v_ref
    );
END;
$$;

REVOKE ALL ON FUNCTION avora.fn_process_sepay_refund_payout(TEXT, NUMERIC, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION avora.fn_process_sepay_refund_payout(TEXT, NUMERIC, TEXT, TEXT) TO service_role;

