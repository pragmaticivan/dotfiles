class Counter:
    def __init__(self, limit):
        self.limit = limit
        self.used = 0
        self.accepted = set()

    def take(self, key, amount):
        if key in self.accepted:
            return True
        if amount <= 0 or self.used + amount > self.limit:
            return False
        self.accepted.add(key)
        self.used += amount
        return True

    def reset(self):
        self.used = 0
        self.accepted.clear()
