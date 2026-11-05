-- ===========================================================================
-- AVORA - SePay VietQR Disbursement (Giải ngân cho Vendor) setup
-- Chạy file này 1 lần trong Supabase SQL Editor (schema avora).
-- Idempotent: có thể chạy lại nhiều lần.
-- Tiền tố nội dung chuyển khoản giải ngân: AVRWD + 7-9 chữ số (khác AVORA của booking).
-- ===========================================================================
SET search_path TO avora;

-- 1. Cột phục vụ đối soát giải ngân tự động.
ALTER TABLE avora.t_withdrawal_request
    ADD COLUMN IF NOT EXISTS payment_code         VARCHAR(30),   -- AVRWDxxxxxxxx (memo chuyển khoản)
    ADD COLUMN IF NOT EXISTS paid_at              TIMESTAMP,     -- thời điểm giải ngân thành công
    ADD COLUMN IF NOT EXISTS settlement_source    VARCHAR(20),   -- SEPAY | MANUAL
    ADD COLUMN IF NOT EXISTS sepay_transaction_id VARCHAR(64),   -- id giao dịch SePay (chống trùng / đối soát)
    ADD COLUMN IF NOT EXISTS settled_by           UUID;          -- BM xác nhận thủ công (nếu có)

-- 2. Mỗi payment_code là duy nhất.
CREATE UNIQUE INDEX IF NOT EXISTS uidx_withdrawal_payment_code
    ON avora.t_withdrawal_request (payment_code)
    WHERE payment_code IS NOT NULL;

-- 3. Hàm xử lý webhook SePay (tiền RA) - TOÀN BỘ chạy trong 1 transaction.
--    Trả về JSONB { result: ... }:
--      SETTLED | ALREADY_SETTLED | DUPLICATE_PAYOUT | AMOUNT_MISMATCH | INVALID_STATUS | NOT_FOUND
CREATE OR REPLACE FUNCTION avora.fn_process_sepay_withdrawal(
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
    v_req   avora.t_withdrawal_request%ROWTYPE;
    v_apr   TEXT;
    v_cmp   TEXT;
    v_now   TIMESTAMP := now()::timestamp;  -- cùng kiểu với created_at DEFAULT NOW()
    v_ref   TEXT;
BEGIN
    SELECT code_cd INTO v_apr FROM avora.m_system_code WHERE business_cd = 'WITHDRAWAL_STS' AND upper(code_name) = 'APR' LIMIT 1;
    SELECT code_cd INTO v_cmp FROM avora.m_system_code WHERE business_cd = 'WITHDRAWAL_STS' AND upper(code_name) = 'CMP' LIMIT 1;

    -- Khóa yêu cầu giải ngân (chống race với webhook retry / xác nhận thủ công)
    SELECT * INTO v_req
      FROM avora.t_withdrawal_request
     WHERE payment_code = upper(p_payment_code)
     FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('result', 'NOT_FOUND');
    END IF;

    -- Đã hoàn tất trước đó
    IF v_req.status_cd = v_cmp THEN
        -- Cùng id giao dịch (webhook retry) hoặc đã xác nhận thủ công -> không phải chi trùng
        IF p_sepay_tx_id IS NULL
           OR v_req.sepay_transaction_id IS NULL
           OR v_req.sepay_transaction_id = p_sepay_tx_id THEN
            RETURN jsonb_build_object('result', 'ALREADY_SETTLED', 'withdrawal_id', v_req.withdrawal_id);
        END IF;
        -- Một giao dịch SePay KHÁC cùng memo -> nguy cơ chi tiền 2 lần, cần kế toán kiểm tra
        RETURN jsonb_build_object(
            'result', 'DUPLICATE_PAYOUT',
            'withdrawal_id', v_req.withdrawal_id,
            'received', p_transfer_amount
        );
    END IF;

    -- Chỉ yêu cầu đã duyệt (Chờ thanh toán) mới được quyết toán
    IF v_req.status_cd IS DISTINCT FROM v_apr THEN
        RETURN jsonb_build_object(
            'result', 'INVALID_STATUS',
            'withdrawal_id', v_req.withdrawal_id,
            'status_cd', v_req.status_cd
        );
    END IF;

    -- Tiền chi ra phải KHỚP CHÍNH XÁC (chi dư/thiếu đều cần xử lý thủ công)
    IF p_transfer_amount IS DISTINCT FROM v_req.amount THEN
        RETURN jsonb_build_object(
            'result', 'AMOUNT_MISMATCH',
            'withdrawal_id', v_req.withdrawal_id,
            'expected', v_req.amount,
            'received', p_transfer_amount
        );
    END IF;

    v_ref := COALESCE(NULLIF(trim(p_gateway_ref), ''), 'SEPAY-' || COALESCE(p_sepay_tx_id, upper(p_payment_code)));

    UPDATE avora.t_withdrawal_request
       SET status_cd               = v_cmp,
           gateway_transaction_ref = v_ref,
           paid_at                 = v_now,
           settlement_source       = 'SEPAY',
           sepay_transaction_id    = p_sepay_tx_id,
           updated_at              = v_now
     WHERE withdrawal_id = v_req.withdrawal_id;

    RETURN jsonb_build_object(
        'result', 'SETTLED',
        'withdrawal_id', v_req.withdrawal_id,
        'gateway_transaction_ref', v_ref
    );
END;
$$;

-- Chỉ backend (service_role) được gọi hàm này.
REVOKE ALL ON FUNCTION avora.fn_process_sepay_withdrawal(TEXT, NUMERIC, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION avora.fn_process_sepay_withdrawal(TEXT, NUMERIC, TEXT, TEXT) TO service_role;

