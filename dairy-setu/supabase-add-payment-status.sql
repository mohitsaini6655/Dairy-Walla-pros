ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid';

UPDATE orders
SET payment_status = 'unpaid'
WHERE payment_status IS NULL;
