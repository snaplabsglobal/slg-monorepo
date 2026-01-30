-- 检查 transaction 是否存在
select
  id,
  organization_id,
  vendor_name,
  total_amount,
  direction,
  status
from
  transactions
where
  id = 'a798e0e3-a630-4ded-8f79-d9efb791389e';

-- 检查符合查询条件的 transactions
select
  t.id,
  t.organization_id,
  t.vendor_name,
  t.total_amount,
  t.direction
from
  transactions t
where
  t.organization_id = '2fb12b1f-0d9f-4a6a-8518-cf3030ebe717'
  and t.direction = 'expense'
  and t.deleted_at is null
order by
  t.transaction_date desc
limit
  5;