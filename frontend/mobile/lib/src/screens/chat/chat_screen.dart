import 'package:flutter/material.dart';

import '../../services/api_service.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _api = ApiService.instance;
  final _msg = TextEditingController();
  bool _loading = true;
  bool _sending = false;
  List<dynamic> _conversations = [];
  List<dynamic> _messages = [];
  int? _activeSessionId;

  @override
  void initState() {
    super.initState();
    _loadConversations();
  }

  @override
  void dispose() {
    _msg.dispose();
    super.dispose();
  }

  Future<void> _loadConversations() async {
    setState(() => _loading = true);
    try {
      _conversations = await _api.getChats();
    } catch (e) {
      if (mounted) _snack(e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openConversation(int sessionId) async {
    setState(() {
      _activeSessionId = sessionId;
      _messages = [];
    });
    try {
      _messages = await _api.getMessages(sessionId);
      if (mounted) setState(() {});
    } catch (e) {
      if (mounted) _snack(e.toString());
    }
  }

  Future<void> _send() async {
    if (_activeSessionId == null || _msg.text.trim().isEmpty) return;
    final text = _msg.text.trim();
    setState(() => _sending = true);
    try {
      await _api.sendMessage(_activeSessionId!, text);
      _msg.clear();
      await _openConversation(_activeSessionId!);
    } catch (e) {
      if (mounted) _snack(e.toString());
    } finally {
      if (mounted) setState(() => _sending = false);
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
                        reverse: false,
                        itemCount: _messages.length,
                        itemBuilder: (_, i) {
                          final m = _messages[i] as Map<String, dynamic>;
                          final text = m['message']?.toString() ?? '';
                          final attachment = m['attachment_name']?.toString();
                          return ListTile(
                            title: Text(text.isEmpty
                                ? (attachment ?? '[attachment]')
                                : text),
                            subtitle: attachment != null && text.isNotEmpty
                                ? Text(attachment)
                                : null,
                          );
                        },
                      ),
              ),
              Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
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
