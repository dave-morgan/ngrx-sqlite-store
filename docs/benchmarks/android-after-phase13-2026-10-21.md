# Android benchmark 2026-10-21

Device: sdk_gphone64_x86_64 (API 35), WebView name, version. Toggle samples: 30. Emission runs: 200.

| impl | size | firstReadyMs | relaunchReadyMs | heapTodosMb | heapNotesMb | heapRelaunchMb | pssTodosMb | toggleP50 | toggleP95 | emitP50 | emitP95 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| classic | 1000 | 827 | 2676 | 4.7 | 5.5 | 4.6 | 136.4 | 6.3 | 23.5 | 0.1 | 1.8 |
| classic | 10000 | 950 | 2829 | 7.1 | 9.5 | 7.1 | 145.2 | 12.3 | 28.9 | 0.1 | 1.1 |
| classic | 50000 | 1067 | 3052 | 18.7 | 34.1 | 18.7 | 145.7 | 44.6 | 90.5 | 0.1 | 0.9 |
| sqlite | 1000 | 2751 | 4030 | 6.4 | 8 | 5.6 | 147.4 | 50.9 | 225.1 | 66.5 | 83.3 |
| sqlite | 10000 | 5114 | 6220 | 14.2 | 15.2 | 9.6 | 156.8 | 47.1 | 243.8 | 65.8 | 83 |
| sqlite | 50000 | 15098 | 11710 | 35.3 | 36.7 | 13.9 | 196.5 | 97.7 | 314.1 | 65 | 88.3 |

<details><summary>raw</summary>

```json
[
  {
    "impl": "classic",
    "size": 1000,
    "firstReadyMs": 827,
    "relaunchReadyMs": 2676,
    "heapTodosMb": 4.7,
    "heapNotesMb": 5.5,
    "heapRelaunchMb": 4.6,
    "pssTodosMb": 136.4,
    "toggleP50": 6.3,
    "toggleP95": 23.5,
    "emitP50": 0.1,
    "emitP95": 1.8
  },
  {
    "impl": "classic",
    "size": 10000,
    "firstReadyMs": 950,
    "relaunchReadyMs": 2829,
    "heapTodosMb": 7.1,
    "heapNotesMb": 9.5,
    "heapRelaunchMb": 7.1,
    "pssTodosMb": 145.2,
    "toggleP50": 12.3,
    "toggleP95": 28.9,
    "emitP50": 0.1,
    "emitP95": 1.1
  },
  {
    "impl": "classic",
    "size": 50000,
    "firstReadyMs": 1067,
    "relaunchReadyMs": 3052,
    "heapTodosMb": 18.7,
    "heapNotesMb": 34.1,
    "heapRelaunchMb": 18.7,
    "pssTodosMb": 145.7,
    "toggleP50": 44.6,
    "toggleP95": 90.5,
    "emitP50": 0.1,
    "emitP95": 0.9
  },
  {
    "impl": "sqlite",
    "size": 1000,
    "firstReadyMs": 2751,
    "relaunchReadyMs": 4030,
    "heapTodosMb": 6.4,
    "heapNotesMb": 8,
    "heapRelaunchMb": 5.6,
    "pssTodosMb": 147.4,
    "toggleP50": 50.9,
    "toggleP95": 225.1,
    "emitP50": 66.5,
    "emitP95": 83.3
  },
  {
    "impl": "sqlite",
    "size": 10000,
    "firstReadyMs": 5114,
    "relaunchReadyMs": 6220,
    "heapTodosMb": 14.2,
    "heapNotesMb": 15.2,
    "heapRelaunchMb": 9.6,
    "pssTodosMb": 156.8,
    "toggleP50": 47.1,
    "toggleP95": 243.8,
    "emitP50": 65.8,
    "emitP95": 83
  },
  {
    "impl": "sqlite",
    "size": 50000,
    "firstReadyMs": 15098,
    "relaunchReadyMs": 11710,
    "heapTodosMb": 35.3,
    "heapNotesMb": 36.7,
    "heapRelaunchMb": 13.9,
    "pssTodosMb": 196.5,
    "toggleP50": 97.7,
    "toggleP95": 314.1,
    "emitP50": 65,
    "emitP95": 88.3
  }
]
```
</details>
