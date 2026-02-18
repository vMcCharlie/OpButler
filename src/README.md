# Source Code Overview

This directory contains the core logic for **OpButler - Your Personal DeFi Concierge**.

## 🏗️ Core Pillars

1.  **[Frontend Interface](./frontend/)**: The Next.js web dashboard for users to manage positions and strategies.
2.  **[AI Risk Agent](./telegrambot/)**: The Node.js watchdog that monitors positions 24/7 and sends alerts via Telegram.
3.  **[Database Schema](./supabase/)**: The Supabase SQL migrations that store user preferences and risk thresholds.

---

### 🚀 Getting Started
To get the full project running, you need to set up all three components:
- [x] **Database**: Apply migrations in `src/supabase/`.
- [x] **Agent**: Configure and start the bot in `src/telegrambot/`.
- [x] **Frontend**: Launch the web dashboard in `src/frontend/`.

For detailed instructions, refer to the **[Technical Architecture Guide](../docs/TECHNICAL.md)**.
