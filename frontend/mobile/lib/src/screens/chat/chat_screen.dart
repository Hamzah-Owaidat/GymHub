import 'dart:convert';
import 'dart:async';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:provider/provider.dart';
import 'package:pusher_channels_flutter/pusher_channels_flutter.dart';

import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  static const String _chatEvent = 'chat.message.created';

  final _api = ApiService.instance;
  final _pusher = PusherChannelsFlutter.getInstance();
  final _msg = TextEditingController();
  Timer? _pollTimer;
  PlatformFile? _pickedFile;
  bool _emojiOpen = false;
  static const List<String> _emojis = [
    '😀', '😂', '😍', '👍', '🙏', '🔥', '🎉', '💪', '😎', '🤝',
  ];

  bool _loading = true;
  bool _sending = false;
  bool _realtimeReady = false;
  int? _subscribedUserId;
  List<dynamic> _conversations = [];
  List<dynamic> _messages = [];
  int? _activeSessionId;

  @override
  void initState() {
    super.initState();
    _loadConversations();
    _startPolling();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _ensureRealtimeSubscription();
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _msg.dispose();
    _disposeRealtime();
    super.dispose();
  }

  Future<void> _loadConversations({bool showLoader = true}) async {
    if (showLoader) {
      setState(() => _loading = true);
    }
    try {
      _conversations = await _api.getChats();
    } catch (e) {
      if (mounted) _snack(e.toString());
    } finally {
      if (mounted && showLoader) setState(() => _loading = false);
    }
  }

  Future<void> _openConversation(int sessionId, {bool clearFirst = true}) async {
    if (clearFirst) {
      setState(() {
        _activeSessionId = sessionId;
        _messages = [];
      });
    } else if (_activeSessionId != sessionId) {
      setState(() => _activeSessionId = sessionId);
    }
    try {
      _messages = await _api.getMessages(sessionId);
      if (mounted) setState(() {});
    } catch (e) {
      if (mounted) _snack(e.toString());
    }
  }

  Future<void> _send() async {
    if (_activeSessionId == null) return;
    final text = _msg.text.trim();
    final file = _pickedFile;
    if (text.isEmpty && file == null) return;

    setState(() => _sending = true);
    try {
      await _api.sendMessage(
        _activeSessionId!,
        message: text.isEmpty ? null : text,
        attachmentPath: file?.path,
        attachmentName: file?.name,
      );
      _msg.clear();
      _pickedFile = null;
      _emojiOpen = false;
      await _openConversation(_activeSessionId!);
    } catch (e) {
      if (mounted) _snack(e.toString());
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _pickAttachment() async {
    final res = await FilePicker.platform.pickFiles(
      allowMultiple: false,
      type: FileType.custom,
      allowedExtensions: const ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'pdf', 'doc', 'docx'],
    );
    if (res == null || res.files.isEmpty) return;
    final file = res.files.first;
    if (file.path == null || file.path!.isEmpty) {
      if (mounted) _snack('Unable to read selected file');
      return;
    }
    setState(() => _pickedFile = file);
  }

  void _startPolling() {
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 3), (_) async {
      if (!mounted || _loading) return;
      await _loadConversations(showLoader: false);
      if (_activeSessionId != null) {
        await _openConversation(_activeSessionId!, clearFirst: false);
      }
    });
  }

  Future<void> _ensureRealtimeSubscription() async {
    final auth = context.read<AuthProvider>();
    final rawId = auth.user?['id'];
    final userId = rawId is int ? rawId : int.tryParse('${rawId ?? ''}');
    if (userId == null) return;
    if (_subscribedUserId == userId && _realtimeReady) return;

    final key = (dotenv.env['PUSHER_KEY'] ?? '').trim();
    final cluster = (dotenv.env['PUSHER_CLUSTER'] ?? '').trim();
    if (key.isEmpty || cluster.isEmpty) return;

    try {
      if (_subscribedUserId != null && _subscribedUserId != userId) {
        await _pusher.unsubscribe(channelName: 'chat-user-$_subscribedUserId');
      }

      if (!_realtimeReady) {
        await _pusher.init(
          apiKey: key,
          cluster: cluster,
          onEvent: _onPusherEvent,
        );
        await _pusher.connect();
        _realtimeReady = true;
      }

      await _pusher.subscribe(channelName: 'chat-user-$userId');
      _subscribedUserId = userId;
    } catch (_) {
      // Keep chat usable even if realtime setup fails.
    }
  }

  Future<void> _disposeRealtime() async {
    try {
      if (_subscribedUserId != null) {
        await _pusher.unsubscribe(channelName: 'chat-user-$_subscribedUserId');
      }
    } catch (_) {}
  }

  Future<void> _onPusherEvent(PusherEvent event) async {
    if (event.eventName != _chatEvent) return;
    int? sessionId;
    try {
      final data = jsonDecode(event.data);
      if (data is Map<String, dynamic>) {
        final raw = data['session_id'];
        sessionId = raw is int ? raw : int.tryParse('${raw ?? ''}');
      }
    } catch (_) {}

    if (!mounted) return;
    await _loadConversations(showLoader: false);

    if (sessionId != null && _activeSessionId != null && sessionId == _activeSessionId) {
      await _openConversation(_activeSessionId!, clearFirst: false);
    }
  }

  void _snack(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  String _participantName(Map<String, dynamic> conv) {
    final p = conv['participant'];
    if (p is Map) {
      final first = p['first_name']?.toString() ?? '';
      final last = p['last_name']?.toString() ?? '';
      final name = '$first $last'.trim();
      if (name.isNotEmpty) return name;
    }
    return 'Conversation';
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final rawUserId = auth.user?['id'];
    final currentUserId = rawUserId is int ? rawUserId : int.tryParse('${rawUserId ?? ''}');

    if (_loading) return const Center(child: CircularProgressIndicator());
    final isWide = MediaQuery.sizeOf(context).width > 800;

    final list = _conversations.isEmpty
        ? const Center(child: Text('No conversations yet.'))
        : RefreshIndicator(
            onRefresh: _loadConversations,
            child: ListView.builder(
              itemCount: _conversations.length,
              itemBuilder: (_, i) {
                final c = _conversations[i] as Map<String, dynamic>;
                final sessionId = c['session_id'] as int;
                final lastMessage = c['last_message']?.toString() ?? '';
                final unread = c['unread_count'] is int
                    ? c['unread_count'] as int
                    : int.tryParse(c['unread_count']?.toString() ?? '0') ?? 0;
                return ListTile(
                  selected: _activeSessionId == sessionId,
                  title: Text(_participantName(c)),
                  subtitle: Text(
                    lastMessage.isEmpty ? 'Session #$sessionId' : lastMessage,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  trailing: unread > 0
                      ? CircleAvatar(
                          radius: 10,
                          child: Text(
                            '$unread',
                            style: const TextStyle(fontSize: 11),
                          ),
                        )
                      : null,
                  onTap: () => _openConversation(sessionId),
                );
              },
            ),
          );

    final chatBody = _activeSessionId == null
        ? const Center(child: Text('Select a conversation to start chatting.'))
        : Column(
            children: [
              Expanded(
                child: _messages.isEmpty
                    ? const Center(child: Text('No messages yet.'))
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        itemCount: _messages.length,
                        itemBuilder: (_, i) {
                          final m = _messages[i] as Map<String, dynamic>;
                          final text = m['message']?.toString() ?? '';
                          final attachment = m['attachment_name']?.toString();
                          final senderRaw = m['sender_user_id'];
                          final senderId = senderRaw is int
                              ? senderRaw
                              : int.tryParse('${senderRaw ?? ''}');
                          final mine = currentUserId != null && senderId == currentUserId;
                          final content = text.isEmpty ? (attachment ?? '[attachment]') : text;
                          final createdAt = m['created_at']?.toString();
                          return _MessageBubble(
                            text: content,
                            attachmentLabel: attachment != null && text.isNotEmpty ? attachment : null,
                            createdAt: createdAt,
                            mine: mine,
                          );
                        },
                      ),
              ),
              Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (_pickedFile != null)
                      Container(
                        width: double.infinity,
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        decoration: BoxDecoration(
                          color: Theme.of(context).brightness == Brightness.dark
                              ? const Color(0xFF262626)
                              : const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.attach_file_rounded, size: 16),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                _pickedFile!.name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 12),
                              ),
                            ),
                            IconButton(
                              visualDensity: VisualDensity.compact,
                              onPressed: () => setState(() => _pickedFile = null),
                              icon: const Icon(Icons.close_rounded, size: 18),
                            ),
                          ],
                        ),
                      ),
                    Row(
                      children: [
                        IconButton(
                          onPressed: () => setState(() => _emojiOpen = !_emojiOpen),
                          icon: const Text('🙂', style: TextStyle(fontSize: 18)),
                          tooltip: 'Emoji',
                        ),
                        IconButton(
                          onPressed: _sending ? null : _pickAttachment,
                          icon: const Icon(Icons.attach_file_rounded),
                          tooltip: 'Attachment',
                        ),
                        Expanded(
                          child: TextField(
                            controller: _msg,
                            decoration: const InputDecoration(hintText: 'Type a message...'),
                            onSubmitted: (_) => _send(),
                          ),
                        ),
                        const SizedBox(width: 8),
                        IconButton(
                          onPressed: _sending ? null : _send,
                          icon: const Icon(Icons.send),
                        ),
                      ],
                    ),
                    if (_emojiOpen)
                      Container(
                        width: double.infinity,
                        margin: const EdgeInsets.only(top: 8),
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Theme.of(context).brightness == Brightness.dark
                              ? const Color(0xFF1F1F1F)
                              : const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Wrap(
                          spacing: 6,
                          runSpacing: 6,
                          children: _emojis
                              .map(
                                (e) => InkWell(
                                  borderRadius: BorderRadius.circular(8),
                                  onTap: () {
                                    _msg.text = '${_msg.text}$e';
                                    _msg.selection = TextSelection.fromPosition(
                                      TextPosition(offset: _msg.text.length),
                                    );
                                    setState(() {});
                                  },
                                  child: Padding(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                                    child: Text(e, style: const TextStyle(fontSize: 22)),
                                  ),
                                ),
                              )
                              .toList(),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          );

    if (isWide) {
      return Row(
        children: [
          Expanded(child: list),
          const VerticalDivider(width: 1),
          Expanded(flex: 2, child: chatBody),
        ],
      );
    }
    return _activeSessionId == null
        ? list
        : Scaffold(
            appBar: AppBar(
              title: const Text('Chat'),
              leading: IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => setState(() {
                  _activeSessionId = null;
                  _messages = [];
                }),
              ),
            ),
            body: chatBody,
          );
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({
    required this.text,
    required this.mine,
    this.attachmentLabel,
    this.createdAt,
  });

  final String text;
  final bool mine;
  final String? attachmentLabel;
  final String? createdAt;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = mine
        ? const Color(0xFFFF7A00)
        : (isDark ? const Color(0xFF262626) : const Color(0xFFF1F5F9));
    final fg = mine ? Colors.white : (isDark ? Colors.white : const Color(0xFF0F172A));
    final timeColor = mine ? Colors.white70 : (isDark ? Colors.white54 : Colors.black45);

    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        constraints: const BoxConstraints(maxWidth: 320),
        padding: const EdgeInsets.fromLTRB(12, 9, 12, 7),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(14),
            topRight: const Radius.circular(14),
            bottomLeft: Radius.circular(mine ? 14 : 4),
            bottomRight: Radius.circular(mine ? 4 : 14),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              text,
              style: TextStyle(color: fg, fontSize: 13.5, height: 1.35),
            ),
            if (attachmentLabel != null) ...[
              const SizedBox(height: 4),
              Text(
                attachmentLabel!,
                style: TextStyle(color: fg.withValues(alpha: 0.8), fontSize: 11),
              ),
            ],
            if (createdAt != null && createdAt!.isNotEmpty) ...[
              const SizedBox(height: 3),
              Text(
                _formatTime(createdAt!),
                style: TextStyle(fontSize: 10, color: timeColor),
              ),
            ],
          ],
        ),
      ),
    );
  }

  static String _formatTime(String raw) {
    final d = DateTime.tryParse(raw);
    if (d == null) return '';
    final h = d.hour.toString().padLeft(2, '0');
    final m = d.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }
}
