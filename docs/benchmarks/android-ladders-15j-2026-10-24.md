# Phase 15j known-absence read experiment

Two reversed sweeps use baseline A and candidate B, in A1/B1/B2/A2 order on one verified boot. Raw single-trial observations are diagnostic, not acceptance verdicts. All eight size observations completed without errors.

| Size | Metric | A1 | B1 | B1 - A1 | B2 | A2 | B2 - A2 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1000 | firstReadyMs | 576.000 | 570.000 | -6.000 | 512.700 | 546.100 | -33.400 |
| 1000 | relaunchReadyMs | 1954.900 | 1633.900 | -321.000 | 1752.100 | 1568.000 | 184.100 |
| 1000 | heapRelaunchMb | 4.992 | 4.920 | -0.072 | 4.920 | 4.931 | -0.011 |
| 1000 | pssRelaunchTotalMb | 224.199 | 223.331 | -0.868 | 223.665 | 223.287 | 0.378 |
| 1000 | toggleP50 | 15.100 | 14.300 | -0.800 | 14.900 | 20.500 | -5.600 |
| 1000 | toggleP95 | 50.100 | 61.300 | 11.200 | 56.900 | 47.400 | 9.500 |
| 10000 | firstReadyMs | 725.000 | 733.200 | 8.200 | 737.600 | 781.800 | -44.200 |
| 10000 | relaunchReadyMs | 1703.900 | 1836.600 | 132.700 | 1686.100 | 1570.000 | 116.100 |
| 10000 | heapRelaunchMb | 4.992 | 4.887 | -0.105 | 4.982 | 5.004 | -0.022 |
| 10000 | pssRelaunchTotalMb | 224.196 | 223.629 | -0.567 | 223.788 | 225.902 | -2.114 |
| 10000 | toggleP50 | 22.700 | 19.400 | -3.300 | 16.200 | 16.200 | 0.000 |
| 10000 | toggleP95 | 48.400 | 62.000 | 13.600 | 57.700 | 53.200 | 4.500 |

Baseline SHA-256: `319ab19d06e00a2194a932dd05dd822f633feba9dce672f117079391ba351aca`. Candidate SHA-256: `c5778281c6ee310476b10fe51647e0248f01abba9590a8021c6fce74a03009b3`. Both A runs share their hash, as do both B runs. Source logs `.tmp/15j-ab.stdout.log` and `.tmp/15j-ab.stderr.log`; raw JSON `.tmp/15j-ab-{A1,B1,B2,A2}.json`.

The new integration regression establishes SQL elimination for a selected known-absent slice. These timings do not establish a robust general startup improvement: the 1k first-ready differences are small relative to prior session variance, 10k first-ready changes direction, and relaunch changes direction at both sizes. A candidate startup trace is required to determine whether the actual harness uses the optimized path. No new acceptance pass is claimed.
