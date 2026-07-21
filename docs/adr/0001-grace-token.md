# Grace Token (заморозка) instead of V1 grace gate

Sushkobot V1 used an invisible threshold: if sober streak ≥ N, slips became `minor_slip`. Sobrina uses a **visible Grace Token** (cap 1, earn when streak reaches N, default N=3): slip or Deadline silence spends it; late sober fix refunds. Clearer UX for an agentic product; stats can show «заморозка есть/нет»; agent can remind. Trade-off: more state than a pure threshold, but legibility wins.
