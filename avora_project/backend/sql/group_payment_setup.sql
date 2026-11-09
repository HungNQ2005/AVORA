-- ===========================================================================
-- AVORA - Group Payment (Thanh toán nhóm) & Customer Refund Bank Account Setup
-- Chạy file này trong Supabase SQL Editor / PostgreSQL (schema avora).
-- Idempotent: có thể chạy lại nhiều lần an toàn.
-- ===========================================================================
SET search_path TO avora;

-- 1. Đảm bảo bảng m_user có 3 cột lưu STK nhận tiền hoàn mặc định của khách
ALTER TABLE avora.m_user
    ADD COLUMN IF NOT EXISTS refund_bank_cd        VARCHAR(50),
    ADD COLUMN IF NOT EXISTS refund_account_number VARCHAR(100),
    ADD COLUMN IF NOT EXISTS refund_account_holder VARCHAR(255);

-- 2. Bổ sung các cột quản lý phiên gom tiền cho bảng t_payment_sharing_group
ALTER TABLE avora.t_payment_sharing_group
    ADD COLUMN IF NOT EXISTS host_user_id    UUID REFERENCES avora.m_user(user_id),
    ADD COLUMN IF NOT EXISTS total_collected NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS expires_at      TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_sharing_group_booking
    ON avora.t_payment_sharing_group (booking_id)
    WHERE booking_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_sharing_group_invite_hash
    ON avora.t_payment_sharing_group (invite_link_hash)
    WHERE invite_link_hash IS NOT NULL;

-- 3. Tạo bảng thành viên thanh toán nhóm (t_payment_sharing_member)
CREATE TABLE IF NOT EXISTS avora.t_payment_sharing_member (
    member_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id         UUID NOT NULL REFERENCES avora.t_payment_sharing_group(group_id) ON DELETE CASCADE,
    user_id          UUID REFERENCES avora.m_user(user_id),
    member_name      VARCHAR(100) NOT NULL,
    member_phone     VARCHAR(20),
    amount_allocated NUMERIC(12,2) NOT NULL,
    amount_paid      NUMERIC(12,2) NOT NULL DEFAULT 0,
    payment_code     VARCHAR(30) UNIQUE NOT NULL,
    is_paid          BOOLEAN NOT NULL DEFAULT FALSE,
    paid_at          TIMESTAMP,
    is_host          BOOLEAN NOT NULL DEFAULT FALSE,
    transaction_id   UUID REFERENCES avora.t_payment_transaction(transaction_id),
    created_at       TIMESTAMP DEFAULT NOW(),
    updated_at       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sharing_member_group
    ON avora.t_payment_sharing_member (group_id);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_sharing_member_payment_code
    ON avora.t_payment_sharing_member (payment_code);

-- 4. Hàm xử lý webhook SePay cho giao dịch Thanh toán nhóm (tiền tố AVRGPxxxxxxxx)
--    Chạy atomic toàn bộ trong 1 transaction.
CREATE OR REPLACE FUNCTION avora.fn_process_sepay_group_payment(
    p_payment_code    TEXT,
    p_transfer_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = avora, public
AS $$
DECLARE
    v_member         avora.t_payment_sharing_member%ROWTYPE;
    v_group          avora.t_payment_sharing_group%ROWTYPE;
    v_booking        avora.t_booking%ROWTYPE;
    v_wallet         avora.t_hotel_wallet%ROWTYPE;
    v_host_user      avora.m_user%ROWTYPE;
    v_tx_id          UUID;
    v_existing_ref   UUID;
    v_star_quality   INT;
    v_pnd            TEXT;
    v_cfm            TEXT;
    v_share_pnd      TEXT;
    v_share_cmp      TEXT;
    v_btr            TEXT;
    v_stl_pnd        TEXT;
    v_ledger_rev     TEXT;
    v_refund_pnd     TEXT;
    v_bank_name      TEXT;
    v_refund_reason  TEXT;
    v_rate           NUMERIC(5,2) := 0;
    v_commission     NUMERIC(12,2);
    v_earnings       NUMERIC(12,2);
    v_new_collected  NUMERIC(12,2);
    v_now            TIMESTAMP := now()::timestamp;
BEGIN
    -- 1. Khóa dòng thành viên theo mã thanh toán AVRGP...
    SELECT * INTO v_member
      FROM avora.t_payment_sharing_member
     WHERE payment_code = upper(p_payment_code)
     FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('result', 'NOT_FOUND');
    END IF;

    IF v_member.is_paid THEN
        RETURN jsonb_build_object(
            'result', 'ALREADY_PAID',
            'group_id', v_member.group_id,
            'member_id', v_member.member_id
        );
    END IF;

    -- 2. Khóa nhóm & đơn đặt phòng
    SELECT * INTO v_group
      FROM avora.t_payment_sharing_group
     WHERE group_id = v_member.group_id
     FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('result', 'GROUP_NOT_FOUND');
    END IF;

    SELECT * INTO v_booking
      FROM avora.t_booking
     WHERE booking_id = v_group.booking_id
     FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('result', 'BOOKING_NOT_FOUND');
    END IF;

    -- 3. Kiểm tra số tiền chuyển vào phải đủ số tiền được phân bổ của suất này
    IF p_transfer_amount < v_member.amount_allocated THEN
        RETURN jsonb_build_object(
            'result', 'INSUFFICIENT_AMOUNT',
            'booking_id', v_booking.booking_id,
            'group_id', v_group.group_id,
            'member_id', v_member.member_id,
            'expected', v_member.amount_allocated,
            'received', p_transfer_amount
        );
    END IF;

    -- 4. Tra cứu các mã hệ thống
    SELECT code_cd INTO v_pnd        FROM avora.m_system_code WHERE business_cd = 'BOOKING_STS'     AND upper(code_name) = 'PND' LIMIT 1;
    SELECT code_cd INTO v_cfm        FROM avora.m_system_code WHERE business_cd = 'BOOKING_STS'     AND upper(code_name) = 'CFM' LIMIT 1;
    SELECT code_cd INTO v_share_pnd  FROM avora.m_system_code WHERE business_cd = 'SHARE_STS'       AND upper(code_name) = 'PND' LIMIT 1;
    SELECT code_cd INTO v_share_cmp  FROM avora.m_system_code WHERE business_cd = 'SHARE_STS'       AND upper(code_name) = 'CMP' LIMIT 1;
    SELECT code_cd INTO v_btr        FROM avora.m_system_code WHERE business_cd = 'PAYMENT_METHOD'  AND upper(code_name) = 'BTR' LIMIT 1;
    SELECT code_cd INTO v_stl_pnd    FROM avora.m_system_code WHERE business_cd = 'SETTLEMENT_STS'  AND upper(code_name) = 'PND' LIMIT 1;
    SELECT code_cd INTO v_ledger_rev FROM avora.m_system_code WHERE business_cd = 'LEDGER_TXN_TYPE' AND upper(code_name) = 'REV' LIMIT 1;
    SELECT code_cd INTO v_refund_pnd FROM avora.m_system_code WHERE business_cd = 'REFUND_STS'      AND upper(code_name) = 'PND' LIMIT 1;

    -- 5. Ghi nhận giao dịch vào t_payment_transaction
    INSERT INTO avora.t_payment_transaction (
        booking_id, payer_user_id, amount_paid, payment_method_cd, gateway_ref_id, paid_at, created_at, updated_at
    ) VALUES (
        v_booking.booking_id,
        COALESCE(v_member.user_id, v_booking.user_id),
        p_transfer_amount,
        v_btr,
        upper(p_payment_code),
        v_now,
        v_now,
        v_now
    )
    ON CONFLICT (gateway_ref_id) WHERE gateway_ref_id IS NOT NULL
    DO UPDATE SET
        paid_at           = EXCLUDED.paid_at,
        amount_paid       = EXCLUDED.amount_paid,
        payment_method_cd = COALESCE(EXCLUDED.payment_method_cd, avora.t_payment_transaction.payment_method_cd),
        updated_at        = EXCLUDED.updated_at
    RETURNING transaction_id INTO v_tx_id;

    -- 6. Cập nhật trạng thái thành viên đã đóng tiền
    UPDATE avora.t_payment_sharing_member
       SET is_paid        = TRUE,
           amount_paid    = p_transfer_amount,
           paid_at        = v_now,
           transaction_id = v_tx_id,
           updated_at     = v_now
     WHERE member_id = v_member.member_id;

    v_new_collected := COALESCE(v_group.total_collected, 0) + p_transfer_amount;

    -- ───────── Nhánh hợp lệ: Đơn và Nhóm còn PND và chưa quá hạn 2 tiếng ─────────
    IF v_booking.booking_status_cd = v_pnd
       AND v_group.share_status_cd = v_share_pnd
       AND (v_group.expires_at IS NULL OR v_group.expires_at >= v_now) THEN

        -- Nếu tổng tiền gom được đã đủ 100% -> Hoàn tất nhóm & Xác nhận Booking
        IF v_new_collected >= v_group.total_required THEN
            UPDATE avora.t_payment_sharing_group
               SET total_collected = v_new_collected,
                   share_status_cd = v_share_cmp,
                   updated_at      = v_now
             WHERE group_id = v_group.group_id;

            UPDATE avora.t_booking
               SET booking_status_cd = v_cfm,
                   updated_at        = v_now
             WHERE booking_id = v_booking.booking_id;

            -- Tính hoa hồng & ghi nhận doanh thu chờ đối soát cho khách sạn
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
                'result', 'GROUP_COMPLETED',
                'booking_id', v_booking.booking_id,
                'group_id', v_group.group_id,
                'member_id', v_member.member_id,
                'total_collected', v_new_collected,
                'total_required', v_group.total_required
            );
        END IF;

        -- Chưa đủ 100% -> Cập nhật số tiền đã gom và tiếp tục chờ các thành viên còn lại
        UPDATE avora.t_payment_sharing_group
           SET total_collected = v_new_collected,
               updated_at      = v_now
         WHERE group_id = v_group.group_id;

        RETURN jsonb_build_object(
            'result', 'MEMBER_PAID',
            'booking_id', v_booking.booking_id,
            'group_id', v_group.group_id,
            'member_id', v_member.member_id,
            'total_collected', v_new_collected,
            'total_required', v_group.total_required
        );
    END IF;

    -- ───────── Nhánh quá hạn / đã hủy: Cộng dồn vào 1 yêu cầu hoàn tiền duy nhất cho Trưởng nhóm ─────────
    UPDATE avora.t_payment_sharing_group
       SET total_collected = v_new_collected,
           updated_at      = v_now
     WHERE group_id = v_group.group_id;

    SELECT * INTO v_host_user FROM avora.m_user WHERE user_id = v_booking.user_id;

    IF v_host_user.refund_account_number IS NOT NULL AND trim(v_host_user.refund_account_number) <> '' THEN
        SELECT code_name INTO v_bank_name
          FROM avora.m_system_code
         WHERE business_cd = 'BANK_CD' AND code_cd = v_host_user.refund_bank_cd
         LIMIT 1;

        v_refund_reason := format(
            'Hoàn tiền thanh toán nhóm quá hạn về Trưởng nhóm • Ngân hàng: %s • Số TK: %s • Chủ TK: %s',
            COALESCE(v_bank_name, v_host_user.refund_bank_cd, 'N/A'),
            v_host_user.refund_account_number,
            COALESCE(v_host_user.refund_account_holder, v_host_user.full_name, 'N/A')
        );
    ELSE
        v_refund_reason := 'Hoàn tiền thanh toán nhóm quá hạn về Trưởng nhóm • Chưa cung cấp STK hoàn tiền (Cần xác minh qua Support Ticket)';
    END IF;

    SELECT refund_id INTO v_existing_ref
      FROM avora.t_refund_request
     WHERE booking_id = v_booking.booking_id
       AND refund_status_cd = v_refund_pnd
     ORDER BY created_at DESC
     LIMIT 1
     FOR UPDATE;

    IF v_existing_ref IS NOT NULL THEN
        UPDATE avora.t_refund_request
           SET refund_amount = refund_amount + p_transfer_amount,
               reason        = v_refund_reason,
               updated_at    = v_now
         WHERE refund_id = v_existing_ref;
    ELSE
        INSERT INTO avora.t_refund_request (
            transaction_id, booking_id, refund_amount, refund_status_cd, gateway_refund_ref, reason, created_at, updated_at
        ) VALUES (
            v_tx_id,
            v_booking.booking_id,
            p_transfer_amount,
            v_refund_pnd,
            'REF-GRP-' || upper(substring(v_booking.booking_id::text, 1, 8)),
            v_refund_reason,
            v_now,
            v_now
        );
    END IF;

    RETURN jsonb_build_object(
        'result', 'EXPIRED_REFUND_CREATED',
        'booking_id', v_booking.booking_id,
        'group_id', v_group.group_id,
        'member_id', v_member.member_id,
        'refund_amount', p_transfer_amount
    );
END;
$$;

REVOKE ALL ON FUNCTION avora.fn_process_sepay_group_payment(TEXT, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION avora.fn_process_sepay_group_payment(TEXT, NUMERIC) TO service_role;

-- 5. Nâng cấp hàm fn_process_sepay_payment (Đơn lẻ): tự động đính kèm STK hoàn tiền của m_user nếu khách chuyển trễ quá 10 phút
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
    v_user          avora.m_user%ROWTYPE;
    v_star_quality  INT;
    v_pnd           TEXT;
    v_cfm           TEXT;
    v_btr           TEXT;
    v_stl_pnd       TEXT;
    v_ledger_rev    TEXT;
    v_refund_pnd    TEXT;
    v_bank_name     TEXT;
    v_refund_reason TEXT;
    v_rate          NUMERIC(5,2) := 0;
    v_commission    NUMERIC(12,2);
    v_earnings      NUMERIC(12,2);
    v_now           TIMESTAMP := now()::timestamp;
BEGIN
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

    SELECT * INTO v_booking
      FROM avora.t_booking
     WHERE booking_id = v_tx.booking_id
     FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('result', 'BOOKING_NOT_FOUND');
    END IF;

    IF p_transfer_amount < v_booking.total_amount THEN
        RETURN jsonb_build_object(
            'result', 'INSUFFICIENT_AMOUNT',
            'booking_id', v_booking.booking_id,
            'expected', v_booking.total_amount,
            'received', p_transfer_amount
        );
    END IF;

    SELECT code_cd INTO v_pnd        FROM avora.m_system_code WHERE business_cd = 'BOOKING_STS'     AND upper(code_name) = 'PND' LIMIT 1;
    SELECT code_cd INTO v_cfm        FROM avora.m_system_code WHERE business_cd = 'BOOKING_STS'     AND upper(code_name) = 'CFM' LIMIT 1;
    SELECT code_cd INTO v_btr        FROM avora.m_system_code WHERE business_cd = 'PAYMENT_METHOD'  AND upper(code_name) = 'BTR' LIMIT 1;
    SELECT code_cd INTO v_stl_pnd    FROM avora.m_system_code WHERE business_cd = 'SETTLEMENT_STS'  AND upper(code_name) = 'PND' LIMIT 1;
    SELECT code_cd INTO v_ledger_rev FROM avora.m_system_code WHERE business_cd = 'LEDGER_TXN_TYPE' AND upper(code_name) = 'REV' LIMIT 1;
    SELECT code_cd INTO v_refund_pnd FROM avora.m_system_code WHERE business_cd = 'REFUND_STS'      AND upper(code_name) = 'PND' LIMIT 1;

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

    -- Quá hạn / đã CANCELLED: ghi nhận tiền + tạo yêu cầu hoàn kèm STK của m_user
    UPDATE avora.t_payment_transaction
       SET paid_at           = v_now,
           amount_paid       = p_transfer_amount,
           payment_method_cd = COALESCE(v_btr, payment_method_cd),
           payer_user_id     = COALESCE(payer_user_id, v_booking.user_id),
           updated_at        = v_now
     WHERE transaction_id = v_tx.transaction_id;

    SELECT * INTO v_user FROM avora.m_user WHERE user_id = v_booking.user_id;

    IF v_user.refund_account_number IS NOT NULL AND trim(v_user.refund_account_number) <> '' THEN
        SELECT code_name INTO v_bank_name
          FROM avora.m_system_code
         WHERE business_cd = 'BANK_CD' AND code_cd = v_user.refund_bank_cd
         LIMIT 1;

        v_refund_reason := format(
            'Khách chuyển khoản sau khi đơn hết hạn/đã hủy • Ngân hàng: %s • Số TK: %s • Chủ TK: %s',
            COALESCE(v_bank_name, v_user.refund_bank_cd, 'N/A'),
            v_user.refund_account_number,
            COALESCE(v_user.refund_account_holder, v_user.full_name, 'N/A')
        );
    ELSE
        v_refund_reason := 'Khách chuyển khoản sau khi đơn hết hạn/đã hủy • Chưa cung cấp STK hoàn tiền (Cần xác minh qua Support Ticket)';
    END IF;

    INSERT INTO avora.t_refund_request (
        transaction_id, booking_id, refund_amount, refund_status_cd, gateway_refund_ref, reason
    ) VALUES (
        v_tx.transaction_id,
        v_booking.booking_id,
        p_transfer_amount,
        v_refund_pnd,
        'REF-' || upper(substring(v_booking.booking_id::text, 1, 8)),
        v_refund_reason
    );

    RETURN jsonb_build_object(
        'result', 'EXPIRED_REFUND_CREATED',
        'booking_id', v_booking.booking_id,
        'refund_amount', p_transfer_amount
    );
END;
$$;

REVOKE ALL ON FUNCTION avora.fn_process_sepay_payment(TEXT, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION avora.fn_process_sepay_payment(TEXT, NUMERIC) TO service_role;

