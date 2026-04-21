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
  List<dynamic> _conversations = [];
  List<dynamic> _messages = [];
  int? _activeSessionId;

  @override
  void initState() {
    super.initState();
    _loadConversations();
  }

  Future<void> _loadConversations() async {
    setState(() => _loading = true);
    try {
      _conversations = await _api.getChats();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openConversation(int sessionId) async {
    setState(() => _activeSessionId = sessionId);
    try {
      _messages = await _api.getMessages(sessionId);
      if (mounted) setState(() {});
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> _send() async {
    if (_activeSessionId == null || _msg.text.trim().isEmpty) return;
    try {
      await _api.sendMessage(_activeSessionId!, _msg.text.trim());
      _msg.clear();
      await _openConversation(_activeSessionId!);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    final isWide = MediaQuery.sizeOf(context).width > 800;
    final list = ListView.builder(
      itemCount: _conversations.length,
      itemBuilder: (_, i) {
        final c = _conversations[i] as Map<String, dynamic>;
        final sessionId = c['session_id'] as int;
        return ListTile(
          title: Text(c['coach_name']?.toString() ?? c['user_name']?.toString() ?? 'Conversation'),
          subtitle: Text('Session #$sessionId'),
          onTap: () => _openConversation(sessionId),
        );
      },
    );
    final chatBody = Column(
      children: [
        Expanded(
          child: ListView.builder(
            itemCount: _messages.length,
            itemBuilder: (_, i) {
              final m = _messages[i] as Map<String, dynamic>;
              return ListTile(title: Text(m['message']?.toString() ?? ''));
            },
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Expanded(child: TextField(controller: _msg, decoration: const InputDecoration(hintText: 'Type a message...'))),
              const SizedBox(width: 8),
              IconButton(onPressed: _send, icon: const Icon(Icons.send)),
            ],
          ),
        )
      ],
    );

    if (isWide) {
      return Row(children: [Expanded(child: list), const VerticalDivider(width: 1), Expanded(child: chatBody)]);
    }
    return _activeSessionId == null ? list : chatBody;
  }
}
