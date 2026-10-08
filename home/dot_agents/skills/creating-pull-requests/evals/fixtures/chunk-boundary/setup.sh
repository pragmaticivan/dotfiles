#!/usr/bin/env bash
set -euo pipefail
export GIT_AUTHOR_NAME="Dana Reyes" GIT_AUTHOR_EMAIL="dana@example.com"
export GIT_COMMITTER_NAME="Dana Reyes" GIT_COMMITTER_EMAIL="dana@example.com"
commit() {
  GIT_AUTHOR_DATE="$1" GIT_COMMITTER_DATE="$1" git commit -q -m "$2"
}

git init -q -b main

cat > chunker.py <<'PY'
def chunk(duration: float, size: float) -> list[tuple[float, float]]:
    """Split a clip of `duration` seconds into windows of `size` seconds."""
    chunks = []
    start = 0.0
    while start <= duration:
        chunks.append((start, min(start + size, duration)))
        start += size
    return chunks
PY

cat > test_chunker.py <<'PY'
import unittest

from chunker import chunk


class ChunkTest(unittest.TestCase):
    def test_partial_last_window(self):
        self.assertEqual(chunk(12, 5), [(0, 5), (5, 10), (10, 12)])


if __name__ == "__main__":
    unittest.main()
PY

git add chunker.py test_chunker.py
commit "2026-09-01T10:00:00Z" "feat: add fixed-window clip chunker"

git checkout -q -b fix/chunk-boundary
sed -i.bak 's/while start <= duration:/while start < duration:/' chunker.py
rm chunker.py.bak
git add chunker.py
commit "2026-09-03T14:30:00Z" "fix: stop chunk loop before clip end"
