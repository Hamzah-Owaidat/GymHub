const ChatMessage = require('../../../models/ChatMessage');
const AppError = require('../../../utils/AppError');
const notificationService = require('../../../services/notificationService');
const pusher = require('../../../config/pusher');
const fs = require('fs');
const path = require('path');

const CHAT_EVENT = 'chat.message.created';
const CHAT_STORAGE_BASE = path.join(__dirname, '..', '..', '..', 'public', 'storage', 'chat');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function moveAttachmentToStorage(file, sessionId) {
  ensureDir(CHAT_STORAGE_BASE);
  const sessionDir = path.join(CHAT_STORAGE_BASE, String(sessionId));
  ensureDir(sessionDir);
  const ext = path.extname(file.originalname || file.filename || '');
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
  const targetPath = path.join(sessionDir, filename);
  fs.renameSync(file.path, targetPath);
  return {
    url: `/storage/chat/${sessionId}/${filename}`,
    name: file.originalname || filename,
    mime: file.mimetype || null,
  };
}

function resolveParticipantView(row, currentUserId) {
  const isCoach = Number(currentUserId) === Number(row.coach_user_id);
  return {
    id: isCoach ? row.member_user_id : row.coach_user_id,
    first_name: isCoach ? row.member_first_name : row.coach_first_name,
    last_name: isCoach ? row.member_last_name : row.coach_last_name,
    role: isCoach ? 'user' : 'coach',
  };
}

async function ensureSessionAccess(sessionId, userId) {
  const participants = await ChatMessage.findSessionParticipants(sessionId);
  if (!participants || !participants.coach_user_id) {
    throw new AppError('Chat is available only for sessions with assigned coach', 404);
  }
  const isMember = Number(participants.member_user_id) === Number(userId);
  const isCoach = Number(participants.coach_user_id) === Number(userId);
  if (!isMember && !isCoach) throw new AppError('Not allowed to access this chat', 403);
  return participants;
}

async function listConversations(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return next(new AppError('Authentication required', 401));
    const rows = await ChatMessage.listConversationsForUser(userId);
    const data = rows.map((row) => ({
      session_id: row.session_id,
      session_date: row.session_date,
      start_time: row.start_time,
      end_time: row.end_time,
      session_status: row.session_status,
      participant: resolveParticipantView(row, userId),
      last_message: row.last_message || null,
      last_message_sender_user_id: row.last_message_sender_user_id || null,
      last_message_at: row.last_message_at || null,
      unread_count: Number(row.unread_count) || 0,
    }));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function listMessages(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return next(new AppError('Authentication required', 401));
    const sessionId = Number(req.params.sessionId);
    if (!sessionId) return next(new AppError('Invalid session id', 400));
    const participants = await ensureSessionAccess(sessionId, userId);
    const rows = await ChatMessage.listMessagesBySession(sessionId, Number(req.query.limit) || 100);
    res.json({
      success: true,
      session: {
        id: participants.session_id,
        status: participants.session_status,
      },
      participant: resolveParticipantView(participants, userId),
      data: rows,
    });
  } catch (err) {
    next(err);
  }
}

async function sendMessage(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return next(new AppError('Authentication required', 401));
    const sessionId = Number(req.params.sessionId);
    if (!sessionId) return next(new AppError('Invalid session id', 400));
    const message = String(req.body?.message || '').trim();
    const hasAttachment = !!req.file;
    if (!message && !hasAttachment) return next(new AppError('message or attachment is required', 400));
    if (message.length > 2000) return next(new AppError('message too long (max 2000 chars)', 400));

    const participants = await ensureSessionAccess(sessionId, userId);
    const receiverUserId =
      Number(participants.member_user_id) === Number(userId)
        ? participants.coach_user_id
        : participants.member_user_id;

    let attachment = null;
    if (req.file) {
      attachment = moveAttachmentToStorage(req.file, sessionId);
    }

    const msgId = await ChatMessage.createMessage({
      session_id: sessionId,
      sender_user_id: userId,
      message,
      message_type: attachment ? 'attachment' : 'text',
      attachment_url: attachment ? attachment.url : null,
      attachment_name: attachment ? attachment.name : null,
      attachment_mime: attachment ? attachment.mime : null,
    });
    const saved = await ChatMessage.findById(msgId);

    if (pusher) {
      const payload = {
        session_id: sessionId,
        id: saved.id,
        sender_user_id: saved.sender_user_id,
        message_type: saved.message_type,
        message: saved.message,
        attachment_url: saved.attachment_url,
        attachment_name: saved.attachment_name,
        attachment_mime: saved.attachment_mime,
        created_at: saved.created_at,
      };
      await pusher.trigger(`chat-user-${userId}`, CHAT_EVENT, payload);
      await pusher.trigger(`chat-user-${receiverUserId}`, CHAT_EVENT, payload);
    }

    const senderName =
      Number(participants.member_user_id) === Number(userId)
        ? `${participants.member_first_name || ''} ${participants.member_last_name || ''}`.trim()
        : `${participants.coach_first_name || ''} ${participants.coach_last_name || ''}`.trim();

    await notificationService.sendAndBroadcastToUser(receiverUserId, {
      title: 'New chat message',
      message: `${senderName || 'Someone'} sent you a new message.`,
      type: 'chat',
    });

    res.status(201).json({ success: true, message: saved });
  } catch (err) {
    next(err);
  }
}

async function markRead(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return next(new AppError('Authentication required', 401));
    const sessionId = Number(req.params.sessionId);
    if (!sessionId) return next(new AppError('Invalid session id', 400));
    await ensureSessionAccess(sessionId, userId);
    const updated = await ChatMessage.markSessionMessagesReadByReceiver(sessionId, userId);
    res.json({ success: true, updated });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listConversations,
  listMessages,
  sendMessage,
  markRead,
};
