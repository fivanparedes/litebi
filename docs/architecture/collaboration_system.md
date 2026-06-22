# P2P Collaboration System (Yjs)

LiteBI enables multiple users to work on the same dashboard simultaneously, much like Google Docs. This is achieved entirely on the client-side using a Peer-to-Peer (P2P) architecture.

## How It Works

We use **Yjs**, a CRDT (Conflict-free Replicated Data Type) framework, combined with **y-webrtc** to handle communication.

1. **Shared Document (Y.Doc):** Instead of standard Javascript objects, collaborative state (like widget positions, colors, titles) is stored in a `Y.Doc`.
2. **WebRTC Signaling:** When a user "hosts" or "joins" a session, they connect to a signaling server. *Note: The signaling server only helps peers find each other; it does not process or store any dashboard data.*
3. **P2P Sync:** Once peers are connected via WebRTC, Yjs automatically syncs the `Y.Doc` across all clients.
4. **Vue Binding:** We use custom bindings to reflect changes from the `Y.Doc` directly into our Pinia stores and Vue reactivity system.

## Data Synchronization Scope

Not all data is synced over P2P. We separate **Metadata** from **Raw Data**.

- **Synced (Yjs):** Dashboard layouts, widget configurations, chart colors, titles, applied filters.
- **Not Synced (Local):** The actual raw data tables (DuckDB). 
  - *Why?* Syncing a 500MB CSV file over WebRTC to multiple peers is inefficient and prone to failure.
  - *Solution:* Users collaborating in a room must ensure they have imported the same base dataset locally. The P2P system only syncs the *instructions* (SQL queries, chart configs) on how to visualize that data.

## CRDT Conflict Resolution

Because Yjs uses CRDTs, if User A and User B move the same chart at the exact same millisecond, Yjs mathematically guarantees that both clients will eventually converge on the exact same layout state without requiring a central server to mediate the conflict.

## Awareness & Cursors

`y-webrtc` provides an "Awareness" module. This is used to track transient user states:
- Online presence (who is in the room).
- Mouse cursor positions (to show where colleagues are pointing).
- Selection states (which chart a user currently has selected). 

This awareness data is ephemeral and not saved to the `Y.Doc` or persistent storage.
