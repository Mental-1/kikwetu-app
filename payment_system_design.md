
# Engineering a Robust Payment Handler System

This document outlines the design, architecture, and business logic for implementing a secure, reliable, and scalable payment system within a modern web application like the one provided.

## 1. Core Principles

A robust payment system must be built on the following principles:

*   **Security:** This is non-negotiable. At no point should our server handle or store raw payment credentials (e.g., credit card numbers). All processing must be delegated to a certified Payment Service Provider (PSP).
*   **Reliability:** The system must guarantee that a service paid for is a service delivered. It must be resilient to network failures, duplicate events, and other common issues. The financial state and the application state must always be consistent.
*   **Scalability:** The system should be able to handle growing transaction volume without a degradation in performance.
*   **User Experience:** The payment process should be seamless, provide clear feedback (success, failure, pending), and feel trustworthy to the user.

---

## 2. System Architecture & Components

We will use a decoupled architecture where our application communicates with a third-party PSP. The primary components are:

1.  **Frontend Client:** The user interface (React/Next.js) that captures the user's intent to pay. It will use the PSP's JavaScript SDK (e.g., Stripe.js, PayPal SDK) to securely collect payment information.
2.  **Backend Server (Next.js API Routes):** Our server will be responsible for:
    *   Creating payment intents.
    *   Securing and handling webhooks.
    *   Updating the database.
    *   Fulfilling the purchased service (e.g., activating a featured listing).
3.  **Payment Service Provider (PSP):** A third-party service like **Stripe**, **PayPal**, or **Paystack** (which appears to be used in this project, based on `public/PayStack_Logo.png`). The PSP handles all PCI compliance, fraud detection, and the actual movement of money.
4.  **Database:** Stores records of all transactions, their statuses, and links them to users and the services they purchased.
5.  **Webhook Handler:** A dedicated API endpoint on our backend that listens for asynchronous notifications from the PSP about payment status changes. **This is the most critical component for reliability.**

### High-Level Flow Diagram

```
(User)         (Frontend)           (Backend)            (PSP)             (Database)
  |                |                    |                  |                   |
  | Clicks "Pay"   |                    |                  |                   |
  |--------------->|                    |                  |                   |
  |                |  Request to        |                  |                   |
  |                |  initiate payment  |                  |                   |
  |                |------------------->|                  |                   |
  |                |                    | Create Transaction |                   |
  |                |                    | (status: PENDING)  |                   |
  |                |                    |-------------------------------------->|
  |                |                    | Create Payment     |                   |
  |                |                    | Intent with PSP    |                   |
  |                |                    |------------------->|                   |
  |                |                    |                    | Returns Intent ID |
  |                |                    |<-------------------|                   |
  |                |  Returns Intent ID |                    |                   |
  |                |<-------------------|                    |                   |
  |                |                    |                  |                   |
  |                | Submits payment   |                  |                   |
  |                | details to PSP SDK|                  |                   |
  |                |--------------------------------------->|                   |
  |                |                    |                  |                   |
  |                | (Waits for result)|                  | Processes Payment |                   |
  |                |                    |                  | (Success/Fail)  |                   |
  |                |                    |                  |------------------>| (Bank etc.)
  |                |                    |                  |                   |
  |                |                    |  Webhook Event     |                   |
  |                |                    |  (e.g., 'charge.success') |                   |
  |                |                    |<-------------------|                   |
  |                |                    |                  |                   |
  |                |                    | Verify & Process   |                   |
  |                |                    | Webhook, Fulfill   |                   |
  |                |                    | Order              |                   |
  |                |                    |------------------->| Update Transaction|
  |                |                    |                    | (status: COMPLETE)|
  |                |                    |                    | & Fulfill Service |
  |                |                    |                    |------------------>|
  |                |                    |                  |                   |
  | User sees      |                    |                  |                   |
  | Success/Fail   |                    |                  |                   |
  |<---------------| (UI updates)       |                  |                   |
  |                |                    |                  |                   |
```

---

## 3. Database Design

The database schema is the foundation of our payment system's reliability. We need to track what was bought, by whom, and the status of the payment.

Given your existing structure, we'll need a `transactions` table and likely a `products` or `services` table to define what can be purchased.

### `transactions` Table

This is the central table for tracking every payment attempt.

| Column                  | Data Type     | Description                                                                                             | Constraints                |
| ----------------------- | ------------- | ------------------------------------------------------------------------------------------------------- | -------------------------- |
| `id`                    | `UUID`        | Unique identifier for our internal transaction record.                                                  | PRIMARY KEY                |
| `user_id`               | `UUID`        | Foreign key referencing the `users` table.                                                              | NOT NULL, FOREIGN KEY      |
| `listing_id`            | `UUID`        | Foreign key to the `listings` table (or whatever item is being paid for). Can be NULL if not applicable.  | FOREIGN KEY                |
| `product_id`            | `VARCHAR(100)`| A string identifier for the product/service purchased (e.g., 'featured-listing-7-days').                | NOT NULL                   |
| `amount`                | `INTEGER`     | The transaction amount in the smallest currency unit (e.g., cents) to avoid floating-point errors.      | NOT NULL                   |
| `currency`              | `VARCHAR(3)`  | 3-letter ISO currency code (e.g., 'usd', 'kes').                                                        | NOT NULL                   |
| `status`                | `ENUM`        | The state of the transaction: `'pending'`, `'completed'`, `'failed'`, `'refunded'`.                     | NOT NULL, DEFAULT 'pending'|
| `psp`                   | `VARCHAR(50)` | The payment service provider used (e.g., 'stripe', 'paystack').                                         | NOT NULL                   |
| `psp_transaction_id`    | `VARCHAR(255)`| The unique transaction ID from the PSP (e.g., Stripe's `pi_...` for Payment Intent). Storing this is vital. | UNIQUE, INDEX              |
| `psp_event_id`          | `VARCHAR(255)`| The ID of the last webhook event processed for this transaction, used for idempotency.                    | NULLABLE, INDEX            |
| `created_at`            | `TIMESTAMPTZ` | Timestamp of creation.                                                                                  | NOT NULL, DEFAULT `now()`  |
| `updated_at`            | `TIMESTAMPTZ` | Timestamp of the last update.                                                                           | NOT NULL, DEFAULT `now()`  |

### `products` Table (or a configuration file)

You need a way to define what users can buy. This can be a simple table or even a static configuration file in your code if the offerings are fixed.

| Column       | Data Type     | Description                                                              |
| ------------ | ------------- | ------------------------------------------------------------------------ |
| `id`         | `VARCHAR(100)`| Unique identifier (e.g., 'featured-listing-7-days').                     |
| `name`       | `VARCHAR(255)`| Human-readable name (e.g., "7-Day Featured Listing").                    |
| `description`| `TEXT`        | A description of the service.                                            |
| `price`      | `INTEGER`     | Price in the smallest currency unit.                                     |
| `currency`   | `VARCHAR(3)`  | Default currency for this product.                                       |

---

## 4. Business Logic & Step-by-Step Flow

This is the sequence of events for a successful payment.

**Step 1: Initiation (Client-Side)**
*   A user clicks a "Feature this Ad for $5" button.

**Step 2: Create Payment Intent (Backend)**
*   The frontend calls a Next.js API route, e.g., `POST /api/payments/initiate`.
*   The body of the request includes the `productId` and `listingId`.
*   **On the server:**
    1.  Validate the user is authenticated.
    2.  Look up the product details (price, currency) from your `products` table/config.
    3.  Create a new record in your `transactions` table with `status: 'pending'`.
    4.  Make an API call to your PSP (e.g., Paystack) with the amount, currency, and your internal transaction ID (in metadata).
    5.  The PSP returns a `client_secret` or equivalent.
    6.  The backend returns this `client_secret` to the frontend.

**Step 3: Confirm Payment (Client-Side)**
*   The frontend receives the `client_secret`.
*   It uses the PSP's JavaScript SDK to display the payment form (e.g., a credit card input modal).
*   The user enters their details. The frontend calls the SDK's `confirmPayment` function, passing the `client_secret` and payment details.
*   **Crucially, the sensitive payment details go directly from the user's browser to the PSP's servers, never touching your backend.**
*   The SDK handles 3D Secure authentication if required.
*   The frontend UI now enters a "processing" state.

**Step 4: Asynchronous Confirmation (Webhook)**
*   The PSP processes the payment. This can take seconds or, in some cases, minutes/hours (e.g., bank transfers).
*   Once the payment is resolved (succeeded or failed), the PSP sends an HTTP POST request to your pre-configured webhook endpoint (e.g., `POST /api/webhooks/paystack`).
*   The payload of this request contains the event type (e.g., `charge.success`) and the full transaction object, including the `psp_transaction_id`.

**Step 5: Handle Webhook & Fulfill Order (Backend)**
*   This is the most critical step for reliability.
    1.  **Verify the Signature:** The very first thing you must do is verify the webhook's signature. The PSP includes a signature in the request headers. Using your secret webhook key, you compute a signature from the request body and ensure it matches. **If it doesn't match, reject the request immediately.** This prevents spoofed webhooks.
    2.  **Check for Idempotency:** Extract the event ID from the webhook payload. Check if you have already processed this `psp_event_id`. If you have, send a `200 OK` response and do nothing further. This prevents processing duplicate webhooks.
    3.  **Retrieve the Transaction:** Use the `psp_transaction_id` from the webhook payload to find the corresponding record in your `transactions` table. Verify that its status is still `pending`.
    4.  **Start a Database Transaction:** All subsequent database updates should be wrapped in a single, atomic database transaction to ensure data consistency.
    5.  **Update Transaction Status:** If the event is `charge.success`, update your transaction record:
        *   Set `status` to `'completed'`.
        *   Store the `psp_event_id`.
    6.  **Fulfill the Service:** This is the "business logic" part. Perform the action the user paid for. For example:
        ```sql
        UPDATE listings SET is_featured = true, featured_until = NOW() + INTERVAL '7 days' WHERE id = <transaction.listing_id>;
        ```
    7.  **Commit the Database Transaction.**
    8.  **Send a `200 OK` response** to the PSP to acknowledge receipt of the webhook. If you don't, the PSP will assume it failed and will retry, leading to more duplicate events.

**Step 6: Update UI (Client-Side)**
*   The frontend can be notified of the success in two ways:
    1.  **Polling:** The page can poll a backend endpoint (`GET /api/transactions/{id}`) every few seconds to check the status.
    2.  **WebSockets:** For a more real-time experience, the backend can push a notification to the client via a WebSocket connection after the webhook is successfully processed.

---

## 5. Common Pitfalls & How to Avoid Them

1.  **Pitfall: Relying on the Frontend Callback.**
    *   **Problem:** The user might close their browser after payment but before the callback from the PSP's SDK fires. If you fulfill the order in the callback, you will miss transactions.
    *   **Solution:** **Never fulfill an order based on the frontend state.** The frontend callback is only for updating the UI (e.g., showing a success message). The **webhook is the single source of truth** for the actual transaction status.

2.  **Pitfall: Not Handling Webhooks Idempotently.**
    *   **Problem:** Network issues can cause the PSP to send the same webhook multiple times. If you don't guard against this, you might feature a listing twice or grant a service multiple times for one payment.
    *   **Solution:** Always store the unique event ID from the webhook and check it before processing. (We will improve this in Section 6).

3.  **Pitfall: Not Verifying Webhook Signatures.**
    *   **Problem:** An attacker could find your webhook URL and send fake "success" payloads, tricking your system into giving away services for free.
    *   **Solution:** **Always** perform signature verification as the very first step in your webhook handler. Treat any request that fails verification as a fraudulent attempt.

4.  **Pitfall: Not Using Atomic Database Transactions.**
    *   **Problem:** Imagine your code updates the transaction status to `'completed'`, but then fails before it can update the `listings` table. You have taken the money but not delivered the service.
    *   **Solution:** Wrap the database updates for the transaction status and the service fulfillment in a single, atomic transaction. If any part fails, the entire operation is rolled back, keeping your data consistent.

5.  **Pitfall: Storing Money as Floats/Decimals in Code.**
    *   **Problem:** Floating-point arithmetic can introduce small precision errors, which are unacceptable in financial calculations.
    *   **Solution:** Always work with money in its smallest integer unit (cents, kobo, etc.). Perform all calculations as integers and only format for display at the very end.

6.  **Pitfall: Exposing Secret Keys.**
    *   **Problem:** Committing your PSP secret keys or webhook secrets to Git.
    *   **Solution:** Use environment variables (`.env.local`) for all secrets and ensure `.env.local` is in your `.gitignore` file.

---

## 6. Advanced Topics: Failure Recovery, Retries, and Performance

The simple webhook handler in Section 4 is a good start, but in a real-world system, it can fail. The database might be temporarily down, a third-party service you call might be offline, or a bug could cause a temporary error. To build a truly robust system, we need to separate receiving the webhook from processing it.

### Deeper Dive into Webhook & DB Failure Scenarios

**Common Webhook Issues:**
*   **Out-of-Order Events:** You might receive a `charge.refunded` event before the `charge.succeeded` event. Your logic must be able to handle this.
*   **Timing/Race Conditions:** The webhook can sometimes arrive *before* your backend has finished creating the `pending` transaction in the database (from Step 2). The webhook handler would fail because it can't find the transaction ID.
*   **API Version Mismatch:** The PSP might update their API. If the webhook payload structure changes, your code might fail during parsing.

**Why Database Updates Fail:**
*   **Deadlocks:** Two concurrent webhook handlers might try to lock the same database rows (e.g., a `user` and a `listing`) in a different order, causing the database to terminate one of the transactions.
*   **Connection Issues:** The database server might be restarting, or the connection pool might be exhausted, preventing your handler from getting a connection.
*   **Lock Timeouts:** The fulfillment logic might need to acquire a lock on a row that is held by another long-running process. The query will time out and fail.
*   **Constraint Violations:** A `FOREIGN KEY` constraint could fail if, for example, a user deletes their account *during* the payment process.

### The Solution: A Persistent Event Queue with Retry Logic

To solve these problems, we introduce a new database table, `webhook_events`, and a background worker process.

**New `webhook_events` Table:**

This table acts as a persistent queue, storing every incoming webhook event before it's processed.

| Column           | Data Type     | Description                                                                 | Constraints           |
| ---------------- | ------------- | --------------------------------------------------------------------------- | --------------------- |
| `id`             | `UUID`        | Unique identifier for the event record.                                     | PRIMARY KEY           |
| `psp_event_id`   | `VARCHAR(255)`| The unique event ID from the PSP (e.g., Stripe's `evt_...`).                 | NOT NULL, UNIQUE      |
| `psp`            | `VARCHAR(50)` | The payment service provider.                                               | NOT NULL              |
| `status`         | `ENUM`        | `'received'`, `'processing'`, `'completed'`, `'failed'`.                  | NOT NULL, DEFAULT 'received' |
| `payload`        | `JSONB`       | The full, verified JSON body of the webhook.                                | NOT NULL              |
| `failure_reason` | `TEXT`        | Logs the error message if processing fails.                                 |                       |
| `retry_count`    | `INTEGER`     | How many times we have attempted to process this event.                     | NOT NULL, DEFAULT 0   |
| `next_retry_at`  | `TIMESTAMPTZ` | When the next retry should be attempted. Used for exponential backoff.      |                       |
| `created_at`     | `TIMESTAMPTZ` | Timestamp of creation.                                                      | NOT NULL, DEFAULT `now()` |
| `updated_at`     | `TIMESTAMPTZ` | Timestamp of the last update.                                               | NOT NULL, DEFAULT `now()` |

### Revised High-Performance Webhook Flow

With this new table, the process changes significantly:

**1. The Webhook Endpoint (Fast and Dumb):**
*   The `/api/webhooks/paystack` endpoint becomes extremely simple and fast.
*   **A. Verify Signature:** As always, this is the first and most critical step.
*   **B. Insert into `webhook_events`:**
    *   Attempt to `INSERT` the `psp_event_id` and the full `payload` into the `webhook_events` table with `status: 'received'`.
    *   If the insert fails because of the `UNIQUE` constraint on `psp_event_id`, you've already received this event. This is your **idempotency check**. Immediately return a `200 OK` status.
*   **C. Immediately Respond:** If the insert is successful, immediately return a `200 OK` to the PSP.

> **Why this is better:** Your endpoint now only does one signature check and one `INSERT`. It's incredibly fast and not blocked by business logic or database contention. This makes it highly unlikely to time out from the PSP's perspective.

**2. The Background Worker (Slow and Smart):**
*   This is an asynchronous process (e.g., a cron job, a message queue worker like Celery/BullMQ, or even a serverless function) that runs separately from your main application request-response cycle.
*   It periodically queries the `webhook_events` table for events with `status: 'received'` OR `status: 'failed'` where `next_retry_at` is in the past.
*   For each event it finds:
    1.  It first updates the event's `status` to `'processing'` to prevent other workers from picking up the same job.
    2.  It then runs the **actual business logic** from the original Step 5: find the transaction, start a DB transaction, update tables, fulfill the order.
    3.  **If successful:** It updates the event's `status` to `'completed'`. The job is done.
    4.  **If it fails:**
        *   It logs the error to the `failure_reason` column.
        *   It increments the `retry_count`.
        *   It calculates the next retry time using **exponential backoff** (e.g., `NOW() + (2 ^ retry_count) * INTERVAL '1 minute'`). This prevents hammering a failing service.
        *   It updates the event's `status` back to `'failed'` and sets the `next_retry_at` timestamp.
        *   After a certain number of retries (e.g., 5), you might want to move the event to a final `permanently_failed` state and trigger an alert for manual investigation.

### Benefits of this Advanced Approach

*   **Resilience:** Temporary database outages or third-party API failures will not cause lost transactions. The system will automatically heal and retry.
*   **Performance:** Your webhook endpoint responds almost instantly, improving reliability with the PSP. The heavy processing is offloaded to background workers, so user-facing parts of your application remain fast.
*   **Observability:** The `webhook_events` table gives you a perfect audit log of every event, every attempt to process it, and why it failed. This is invaluable for debugging.
*   **Speeding up the DB:** This architecture inherently speeds up the user-facing database interactions. The only synchronous database write in the critical path is a simple `INSERT`. The more complex `UPDATE`s and business logic happen asynchronously, reducing lock contention and keeping your main API snappy.

---

## 7. Implementing the Background Webhook Processor with pg_cron

To implement the "Slow and Smart" background worker described in Section 6, we can leverage PostgreSQL's `pg_cron` extension. This allows us to schedule a PL/pgSQL function to run periodically directly within the database, ensuring high reliability and keeping processing close to the data.

Below is a sample PL/pgSQL function `process_webhook_events()` that demonstrates how to handle incoming webhooks from both Paystack and Mpesa (specifically, STK Push C2B callbacks), update the transaction status, fulfill the service, and manage retries with exponential backoff.

```sql
-- Ensure you have the pg_cron extension enabled in your database:
-- CREATE EXTENSION pg_cron;

-- Example PL/pgSQL function for webhook processing
CREATE OR REPLACE FUNCTION process_webhook_events()
RETURNS VOID AS $
DECLARE
    event_record RECORD;
    v_internal_transaction_id UUID;
    v_psp_transaction_id VARCHAR(255);
    v_event_type VARCHAR(100);
    v_amount_paid INTEGER;
    v_currency VARCHAR(3);
    v_new_status transactions.status%TYPE;
    v_failure_reason TEXT;
    v_next_retry_at TIMESTAMPTZ;
BEGIN
    -- Loop through events that are ready for processing or retry
    FOR event_record IN
        SELECT *
        FROM webhook_events
        WHERE status IN ('received', 'failed')
          AND next_retry_at <= NOW()
        ORDER BY created_at ASC -- Process older events first
        FOR UPDATE SKIP LOCKED -- Ensures only one worker processes an event at a time
    LOOP
        BEGIN
            -- Mark event as processing
            UPDATE webhook_events
            SET status = 'processing',
                updated_at = NOW()
            WHERE id = event_record.id;

            -- Initialize variables for this event
            v_internal_transaction_id := NULL;
            v_psp_transaction_id := NULL;
            v_event_type := NULL;
            v_amount_paid := NULL;
            v_currency := NULL;
            v_new_status := 'failed'; -- Default to failed, update on success
            v_failure_reason := NULL;

            -- --- PSP-SPECIFIC LOGIC ---
            IF event_record.psp = 'paystack' THEN
                v_event_type := event_record.payload->>'event';
                v_psp_transaction_id := (event_record.payload->'data'->>'id');
                -- Assuming you pass your internal transaction ID in Paystack metadata
                v_internal_transaction_id := (event_record.payload->'data'->'metadata'->>'internal_transaction_id')::UUID;
                v_amount_paid := (event_record.payload->'data'->>'amount')::INTEGER; -- Paystack amount is in kobo/cents
                v_currency := (event_record.payload->'data'->>'currency');

                IF v_event_type = 'charge.success' AND (event_record.payload->'data'->>'status') = 'success' THEN
                    v_new_status := 'completed';
                ELSIF v_event_type = 'charge.failed' THEN
                    v_new_status := 'failed';
                    v_failure_reason := (event_record.payload->'data'->>'gateway_response');
                -- Add more Paystack event types as needed (e.g., 'transfer.success', 'invoice.update')
                END IF;

            ELSIF event_record.psp = 'mpesa' THEN
                -- Assuming STK Push C2B callback structure
                v_event_type := 'stk_callback'; -- Custom event type for Mpesa
                v_internal_transaction_id := (event_record.payload->'Body'->'stkCallback'->>'CheckoutRequestID')::UUID;
                v_psp_transaction_id := (event_record.payload->'Body'->'stkCallback'->>'MpesaReceiptNumber'); -- Mpesa receipt is the PSP transaction ID

                IF (event_record.payload->'Body'->'stkCallback'->>'ResultCode')::INTEGER = 0 THEN
                    v_new_status := 'completed';
                    -- For Mpesa, you might need to extract amount from CallbackMetadata if not already in your transactions table
                    -- Example: v_amount_paid := (event_record.payload->'Body'->'stkCallback'->'CallbackMetadata'->'Item'->0->>'Value')::INTEGER;
                ELSE
                    v_new_status := 'failed';
                    v_failure_reason := (event_record.payload->'Body'->'stkCallback'->>'ResultDesc');
                END IF;

            -- Add more PSPs here
            END IF;

            -- --- CORE BUSINESS LOGIC (Atomic Transaction) ---
            IF v_internal_transaction_id IS NOT NULL THEN
                -- Acquire a transaction-level lock to prevent race conditions on the transaction record
                -- This is crucial if multiple workers might try to update the same transaction
                PERFORM pg_try_advisory_xact_lock(hashtext(v_internal_transaction_id::TEXT));

                -- Update the main transactions table
                UPDATE transactions
                SET status = v_new_status,
                    psp_transaction_id = COALESCE(psp_transaction_id, v_psp_transaction_id), -- Only update if not already set
                    psp_event_id = event_record.psp_event_id,
                    updated_at = NOW()
                WHERE id = v_internal_transaction_id
                  AND status = 'pending'; -- Only update pending transactions

                -- Check if the transaction was updated (i.e., it was found and was pending)
                IF FOUND AND v_new_status = 'completed' THEN
                    -- Fulfill the service (e.g., update listing status)
                    -- This is where your specific business logic for the purchased product goes
                    -- Example:
                    UPDATE listings
                    SET is_featured = TRUE,
                        featured_until = NOW() + INTERVAL '7 days'
                    WHERE id = (SELECT listing_id FROM transactions WHERE id = v_internal_transaction_id);

                    -- Log successful fulfillment
                    RAISE NOTICE 'Transaction % completed and service fulfilled.', v_internal_transaction_id;
                ELSIF FOUND AND v_new_status = 'failed' THEN
                    RAISE NOTICE 'Transaction % failed: %', v_internal_transaction_id, v_failure_reason;
                ELSIF NOT FOUND THEN
                    -- This can happen if the transaction was already processed by another event (e.g., a direct API call)
                    -- or if the internal_transaction_id was invalid/not found.
                    v_failure_reason := COALESCE(v_failure_reason, 'Transaction not found or not in pending state: ' || v_internal_transaction_id);
                    RAISE WARNING 'Webhook processing: %', v_failure_reason;
                END IF;

                -- Release the lock
                PERFORM pg_advisory_xact_unlock(hashtext(v_internal_transaction_id::TEXT));
            ELSE
                v_failure_reason := COALESCE(v_failure_reason, 'Could not extract internal_transaction_id from webhook payload for PSP: ' || event_record.psp);
                RAISE WARNING 'Webhook processing: %', v_failure_reason;
            END IF;

            -- If we reached here, processing was successful for this event record
            UPDATE webhook_events
            SET status = 'completed',
                failure_reason = NULL,
                updated_at = NOW()
            WHERE id = event_record.id;

        EXCEPTION
            WHEN OTHERS THEN
                -- Catch any error during processing of a single event
                v_failure_reason := SQLERRM;
                event_record.retry_count := event_record.retry_count + 1;
                v_next_retry_at := NOW() + (POWER(2, event_record.retry_count) * INTERVAL '1 second'); -- Exponential backoff

                UPDATE webhook_events
                SET status = 'failed',
                    failure_reason = v_failure_reason,
                    retry_count = event_record.retry_count,
                    next_retry_at = v_next_retry_at,
                    updated_at = NOW()
                WHERE id = event_record.id;

                RAISE WARNING 'Error processing webhook event % (PSP: %): % - Retrying at %',
                              event_record.id, event_record.psp, v_failure_reason, v_next_retry_at;
        END;
    END LOOP;
END;
$ LANGUAGE plpgsql;

-- Schedule the cron job to run every 2 seconds
-- Replace 'process_webhooks_job' with a unique name for your job
-- SELECT cron.schedule('process_webhooks_job', '*/2 * * * * *', 'SELECT process_webhook_events();');

-- To unschedule:
-- SELECT cron.unschedule('process_webhooks_job');
