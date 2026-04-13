ALTER TABLE chat_messages
  ADD COLUMN message_type VARCHAR(20) NOT NULL DEFAULT 'text' AFTER sender_user_id,
  ADD COLUMN attachment_url VARCHAR(500) NULL AFTER message,
  ADD COLUMN attachment_name VARCHAR(255) NULL AFTER attachment_url,
  ADD COLUMN attachment_mime VARCHAR(120) NULL AFTER attachment_name;
