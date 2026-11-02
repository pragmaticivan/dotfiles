# Benchmark results

Run on 2026-10-28 with `run_all.sh`. The LLM is Claude Haiku through `claude -p`. The decider is `strands-decider` on Ollama with MLX, on an Apple-silicon Mac with a load average of about 4. Each task has 3 runs.

| Task | Items | Arm | Accuracy | Tokens | Model s | Wall s | Cost $ | Sure | Right when sure | Lost answers |
|---|---|---|---|---|---|---|---|---|---|---|
| commit_type | 60 | llm | 58% (57%-60%) | 59,447 (59,213-59,590) | 23.6 (21.5-24.3) | 29.0 (26.9-29.4) | 0.0033 (0.0032-0.0034) |  |  | 0 |
| commit_type | 60 | decider | 48% | 0 | 7.7 (7.7-7.7) | 7.7 (7.7-7.7) | 0.0000 | 0% | n/a |  |
| commit_type | 60 | hybrid | 62% (60%-65%) | 59,654 (59,196-60,149) | 31.3 (29.9-33.8) | 36.4 (36.0-38.8) | 0.0034 (0.0032-0.0037) |  |  | 0 |
| docs_only | 40 | llm | 100% | 7,500 (7,372-7,695) | 6.0 (5.7-7.0) | 10.0 (9.8-10.9) | 0.0010 (0.0009-0.0011) |  |  | 0 |
| docs_only | 40 | decider | 100% | 0 | 1.7 (1.7-1.7) | 1.7 (1.7-1.7) | 0.0000 | 25% | 100% |  |
| docs_only | 40 | hybrid | 100% | 6,404 (6,353-6,421) | 6.6 (6.2-6.7) | 10.5 (10.2-11.1) | 0.0008 (0.0008-0.0008) |  |  | 0 |
| test_failures | 40 | llm | 100% (98%-100%) | 9,210 (8,609-9,228) | 8.8 (6.1-9.0) | 12.7 (9.8-12.9) | 0.0012 (0.0009-0.0012) |  |  | 0 |
| test_failures | 40 | decider | 60% | 0 | 1.7 (1.7-1.7) | 1.7 (1.7-1.7) | 0.0000 | 0% | n/a |  |
| test_failures | 40 | hybrid | 95% (95%-98%) | 8,456 (8,396-9,091) | 7.5 (6.8-11.2) | 11.8 (10.9-14.9) | 0.0008 (0.0008-0.0023) |  |  | 0 |
| grep_relevance | 40 | llm | 88% (85%-88%) | 7,861 (6,992-7,958) | 11.0 (6.2-11.2) | 14.4 (10.0-14.9) | 0.0013 (0.0009-0.0014) |  |  | 0 |
| grep_relevance | 40 | decider | 62% | 0 | 1.9 (1.9-1.9) | 1.9 (1.9-1.9) | 0.0000 | 0% | n/a |  |
| grep_relevance | 40 | hybrid | 88% (88%-90%) | 8,079 (7,807-8,264) | 12.8 (11.8-13.5) | 16.6 (15.2-16.9) | 0.0014 (0.0013-0.0024) |  |  | 0 |
| review_comments | 40 | llm | 92% (88%-92%) | 5,546 (5,546-5,561) | 2.6 (2.6-2.6) | 6.6 (6.4-6.6) | 0.0005 (0.0005-0.0005) |  |  | 0 |
| review_comments | 40 | decider | 72% | 0 | 1.8 (1.8-1.8) | 1.8 (1.8-1.8) | 0.0000 | 0% | n/a |  |
| review_comments | 40 | hybrid | 92% | 5,546 (5,546-5,565) | 4.0 (4.0-4.2) | 8.0 (7.9-8.3) | 0.0005 (0.0005-0.0013) |  |  | 0 |
| playbook_routing | 40 | llm | 95% (95%-98%) | 4,844 (4,808-5,166) | 5.2 (4.7-6.1) | 9.4 (8.6-10.4) | 0.0007 (0.0007-0.0009) |  |  | 0 |
| playbook_routing | 40 | decider | 90% | 0 | 1.8 (1.8-1.9) | 1.8 (1.8-1.9) | 0.0000 | 0% | n/a |  |
| playbook_routing | 40 | hybrid | 95% (95%-98%) | 5,240 (5,213-5,279) | 8.0 (7.9-8.2) | 12.2 (12.0-12.2) | 0.0010 (0.0009-0.0015) |  |  | 0 |

3 run(s) per task. Values are the median, with the range in brackets.

Decider answers kept at each confidence threshold: the share of items kept, and how many of those are right.

| Task | 0.5 | 0.6 | 0.7 | 0.8 | 0.9 |
|---|---|---|---|---|---|
| commit_type | 17% kept, 90% right | 10% kept, 100% right | 5% kept, 100% right | 3% kept, 100% right | none kept |
| docs_only | 100% kept, 100% right | 100% kept, 100% right | 98% kept, 100% right | 80% kept, 100% right | 28% kept, 100% right |
| test_failures | 40% kept, 88% right | 35% kept, 93% right | 18% kept, 100% right | 8% kept, 100% right | none kept |
| grep_relevance | 100% kept, 62% right | 70% kept, 61% right | 42% kept, 65% right | 18% kept, 71% right | none kept |
| review_comments | 25% kept, 100% right | 10% kept, 100% right | none kept | none kept | none kept |
| playbook_routing | 62% kept, 100% right | 35% kept, 100% right | 15% kept, 100% right | 5% kept, 100% right | none kept |
