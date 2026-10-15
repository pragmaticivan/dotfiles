# Quota counter contract

`Counter(limit)` creates an empty counter. The limit is a positive integer.

`take(key, amount)` accepts a new request when its positive integer amount fits within the remaining quota, including exact capacity.
It returns `True` for acceptance and `False` for rejection.
Acceptance increases `used` by the amount. Rejection leaves all state unchanged.

A repeated accepted key with the same amount returns `True` without increasing `used`, even when the counter is full.
Callers do not reuse an accepted key with a different amount.
A rejected key can succeed with a different valid amount before reset. Rejection does not consume the key.

`reset()` sets `used` to zero and forgets accepted keys.
Keys are strings and amounts are integers. Other input types are outside this contract.
