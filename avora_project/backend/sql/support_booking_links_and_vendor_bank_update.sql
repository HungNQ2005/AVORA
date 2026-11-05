-- Unapplied migration for linking one support request to multiple bookings.
-- Do not run against the live database without explicit approval.
CREATE TABLE IF NOT EXISTS t_support_ticket_booking (
    ticket_id UUID NOT NULL REFERENCES t_support_ticket(ticket_id) ON DELETE CASCADE,
    booking_id UUID NOT NULL REFERENCES t_booking(booking_id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (ticket_id, booking_id)
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_booking_booking
    ON t_support_ticket_booking(booking_id);

INSERT INTO t_support_ticket_booking (ticket_id, booking_id)
SELECT ticket_id, booking_id
FROM t_support_ticket
WHERE booking_id IS NOT NULL
ON CONFLICT (ticket_id, booking_id) DO NOTHING;