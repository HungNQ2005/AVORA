-- ===========================================================================
-- AVORA - SePay VietQR Payment setup
-- Chạy file này 1 lần trong Supabase SQL Editor (schema avora).
-- Idempotent: có thể chạy lại nhiều lần.
-- ===========================================================================
SET search_path TO avora;

-- 1. Mỗi payment_code (gateway_ref_id) là duy nhất.
CREATE UNIQUE INDEX IF NOT EXISTS uidx_payment_tx_gateway_ref
    ON avora.t_payment_transaction (gateway_ref_id)
    WHERE gateway_ref_id IS NOT NULL;

-- 2. Mỗi booking chỉ có tối đa 1 mã thanh toán AVORAx (chống race khi mở trang QR 2 lần).
CREATE UNIQUE INDEX IF NOT EXISTS uidx_payment_tx_booking_avora
    ON avora.t_payment_transaction (booking_id)
    WHERE gateway_ref_id LIKE 'AVORA%';

-- 3. Hàm xử lý webhook SePay - TOÀN BỘ chạy trong 1 transaction (1 lần gọi RPC).
CREATE OR REPLACE FUNCTION avora.fn_process_sepay_payment(
    p_payment_code    TEXT,
    p_transfer_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = avora, public
AS $$
DECLARE
    v_tx            avora.t_payment_transaction%ROWTYPE;
    v_booking       avora.t_booking%ROWTYPE;
    v_wallet        avora.t_hotel_wallet%ROWTYPE;
    v_star_quality  INT;
    v_pnd           TEXT;
    v_cfm           TEXT;
    v_btr           TEXT;
    v_stl_pnd       TEXT;
    v_ledger_rev    TEXT;
    v_refund_pnd    TEXT;
    v_rate          NUMERIC(5,2) := 0;
    v_commission    NUMERIC(12,2);
    v_earnings      NUMERIC(12,2);
    v_now           TIMESTAMP := now()::timestamp;  -- cùng kiểu với created_at DEFAULT NOW()
BEGIN
    -- Khóa giao dịch thanh toán
    SELECT * INTO v_tx
      FROM avora.t_payment_transaction
     WHERE gateway_ref_id = upper(p_payment_code)
     FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('result', 'NOT_FOUND');
    END IF;

    IF v_tx.paid_at IS NOT NULL THEN
        RETURN jsonb_build_object('result', 'ALREADY_PAID', 'booking_id', v_tx.booking_id);
    END IF;

    -- Khóa booking
    SELECT * INTO v_booking
      FROM avora.t_booking
     WHERE booking_id = v_tx.booking_id
     FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('result', 'BOOKING_NOT_FOUND');
    END IF;

    -- Chuyển thiếu tiền -> bỏ qua
    IF p_transfer_amount < v_booking.total_amount THEN
        RETURN jsonb_build_object(
            'result', 'INSUFFICIENT_AMOUNT',
            'booking_id', v_booking.booking_id,
            'expected', v_booking.total_amount,
            'received', p_transfer_amount
        );
    END IF;

    -- Mã hệ thống
    SELECT code_cd INTO v_pnd FROM avora.m_system_code WHERE business_cd = 'BOOKING_STS'     AND upper(code_name) = 'PND' LIMIT 1;
    SELECT code_cd INTO v_cfm FROM avora.m_system_code WHERE business_cd = 'BOOKING_STS'     AND upper(code_name) = 'CFM' LIMIT 1;
    SELECT code_cd INTO v_btr FROM avora.m_system_code WHERE business_cd = 'PAYMENT_METHOD'  AND upper(code_name) = 'BTR' LIMIT 1;
    SELECT code_cd INTO v_stl_pnd    FROM avora.m_system_code WHERE business_cd = 'SETTLEMENT_STS'  AND upper(code_name) = 'PND' LIMIT 1;
    SELECT code_cd INTO v_ledger_rev FROM avora.m_system_code WHERE business_cd = 'LEDGER_TXN_TYPE' AND upper(code_name) = 'REV' LIMIT 1;
    SELECT code_cd INTO v_refund_pnd FROM avora.m_system_code WHERE business_cd = 'REFUND_STS'      AND upper(code_name) = 'PND' LIMIT 1;

    -- ───────── Nhánh hợp lệ: còn PENDING và chưa quá 10 phút ─────────
    IF v_booking.booking_status_cd = v_pnd
       AND v_booking.created_at + INTERVAL '10 minutes' >= v_now THEN

        UPDATE avora.t_payment_transaction
           SET paid_at           = v_now,
               amount_paid       = p_transfer_amount,
               payment_method_cd = COALESCE(v_btr, payment_method_cd),
               payer_user_id     = COALESCE(payer_user_id, v_booking.user_id),
               updated_at        = v_now
         WHERE transaction_id = v_tx.transaction_id;

        UPDATE avora.t_booking
           SET booking_status_cd = v_cfm,
               updated_at        = v_now
         WHERE booking_id = v_booking.booking_id;

        -- Hoa hồng: ưu tiên policy theo priority_level, sau đó policy riêng của khách sạn
        SELECT star_quality INTO v_star_quality FROM avora.m_hotel WHERE hotel_id = v_booking.hotel_id;

        SELECT cp.commission_rate INTO v_rate
          FROM avora.m_commission_policy cp
         WHERE (cp.valid_from IS NULL OR cp.valid_from <= CURRENT_DATE)
           AND (cp.valid_to   IS NULL OR cp.valid_to   >= CURRENT_DATE)
           AND (
                 cp.hotel_id = v_booking.hotel_id
              OR (cp.hotel_id IS NULL AND (cp.star_quality IS NULL OR cp.star_quality = v_star_quality))
           )
         ORDER BY COALESCE(cp.priority_level, 0) DESC,
                  (cp.hotel_id IS NOT NULL) DESC,
                  cp.created_at DESC
         LIMIT 1;

        v_rate       := COALESCE(v_rate, 0);
        v_commission := round(v_booking.total_amount * v_rate / 100, 2);
        v_earnings   := v_booking.total_amount - v_commission;

        INSERT INTO avora.t_settlement (
            booking_id, hotel_id, total_amount_paid, applied_commission_rate,
            commission_amount, host_earnings, settlement_status_cd
        ) VALUES (
            v_booking.booking_id, v_booking.hotel_id, v_booking.total_amount, v_rate,
            v_commission, v_earnings, v_stl_pnd
        )
        ON CONFLICT (booking_id) DO NOTHING;

        -- Ví khách sạn (tạo nếu chưa có)
        INSERT INTO avora.t_hotel_wallet (hotel_id, pending_balance, available_balance)
        VALUES (v_booking.hotel_id, 0, 0)
        ON CONFLICT (hotel_id) DO NOTHING;

        SELECT * INTO v_wallet
          FROM avora.t_hotel_wallet
         WHERE hotel_id = v_booking.hotel_id
         FOR UPDATE;

        UPDATE avora.t_hotel_wallet
           SET pending_balance = COALESCE(pending_balance, 0) + v_earnings,
               updated_at      = v_now
         WHERE wallet_id = v_wallet.wallet_id;

        INSERT INTO avora.t_wallet_ledger (
            wallet_id, transaction_type_cd, amount_change, current_balance, reference_id
        ) VALUES (
            v_wallet.wallet_id, v_ledger_rev, v_earnings,
            COALESCE(v_wallet.pending_balance, 0) + v_earnings,
            v_booking.booking_id::text
        );

        RETURN jsonb_build_object(
            'result', 'CONFIRMED',
            'booking_id', v_booking.booking_id,
            'commission_amount', v_commission,
            'host_earnings', v_earnings
        );
    END IF;

    -- ───────── Nhánh quá hạn / đã CANCELLED: ghi nhận tiền + tạo yêu cầu hoàn ─────────
    UPDATE avora.t_payment_transaction
       SET paid_at           = v_now,
           amount_paid       = p_transfer_amount,
           payment_method_cd = COALESCE(v_btr, payment_method_cd),
           payer_user_id     = COALESCE(payer_user_id, v_booking.user_id),
           updated_at        = v_now
     WHERE transaction_id = v_tx.transaction_id;

    INSERT INTO avora.t_refund_request (
        transaction_id, booking_id, refund_amount, refund_status_cd, reason
    ) VALUES (
        v_tx.transaction_id, v_booking.booking_id, p_transfer_amount, v_refund_pnd,
        'Khách chuyển khoản sau khi đơn đã hết hạn thanh toán hoặc đã bị hủy. Hệ thống tự động tạo yêu cầu hoàn tiền.'
    );

    RETURN jsonb_build_object(
        'result', 'EXPIRED_REFUND_CREATED',
        'booking_id', v_booking.booking_id,
        'refund_amount', p_transfer_amount
    );
END;
$$;

-- Chỉ backend (service_role) được gọi hàm này.
REVOKE ALL ON FUNCTION avora.fn_process_sepay_payment(TEXT, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION avora.fn_process_sepay_payment(TEXT, NUMERIC) TO service_role;
