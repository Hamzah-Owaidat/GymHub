import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../services/api_service.dart';

class SessionsScreen extends StatefulWidget {
  const SessionsScreen({super.key});

  @override
  State<SessionsScreen> createState() => _SessionsScreenState();
}

class _SessionsScreenState extends State<SessionsScreen> {
  final _api = ApiService.instance;
  bool _loading = true;
  List<dynamic> _sessions = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      _sessions = await _api.getSessions();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _sessions.length,
        itemBuilder: (_, i) {
          final s = _sessions[i] as Map<String, dynamic>;
          final date = DateTime.tryParse(s['session_date']?.toString() ?? '');
          return Card(
            child: ListTile(
              title: Text('${s['gym_name'] ?? 'Gym'} • ${s['coach_first_name'] ?? ''} ${s['coach_last_name'] ?? ''}'),
              subtitle: Text(
                '${date != null ? DateFormat('yyyy-MM-dd').format(date) : (s['session_date'] ?? '')}  ${s['start_time']} - ${s['end_time']}',
              ),
              trailing: Text((s['status'] ?? '').toString()),
            ),
          );
        },
      ),
    );
  }
}
