import 'package:flutter/material.dart';

import '../../services/api_service.dart';

class GymDetailsScreen extends StatefulWidget {
  const GymDetailsScreen({super.key, required this.gymId});
  final int gymId;

  @override
  State<GymDetailsScreen> createState() => _GymDetailsScreenState();
}

class _GymDetailsScreenState extends State<GymDetailsScreen> {
  final _api = ApiService.instance;
  Map<String, dynamic>? _gym;
  bool _loading = true;

  final _coachId = TextEditingController();
  final _date = TextEditingController();
  final _start = TextEditingController();
  final _end = TextEditingController();
  final _payMethod = TextEditingController(text: 'cash');
  final _card4 = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      _gym = await _api.getGymById(widget.gymId);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _subscribe() async {
    try {
      await _api.subscribe({
        'gym_id': widget.gymId,
        'payment_method': _payMethod.text.trim(),
        'card_last4': _payMethod.text.trim() == 'card' ? _card4.text.trim() : null,
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Subscription created')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> _bookSession() async {
    try {
      await _api.bookSession({
        'gym_id': widget.gymId,
        'coach_id': int.tryParse(_coachId.text),
        'session_date': _date.text,
        'start_time': _start.text,
        'end_time': _end.text,
        'payment_method': _payMethod.text.trim(),
        'card_last4': _payMethod.text.trim() == 'card' ? _card4.text.trim() : null,
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Session booked')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Gym Details')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text(_gym?['name']?.toString() ?? 'Gym', style: Theme.of(context).textTheme.headlineSmall),
                const SizedBox(height: 6),
                Text(_gym?['location']?.toString() ?? ''),
                const SizedBox(height: 24),
                Text('Book Session', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 8),
                TextField(controller: _coachId, decoration: const InputDecoration(labelText: 'Coach ID')),
                const SizedBox(height: 8),
                TextField(controller: _date, decoration: const InputDecoration(labelText: 'Date (YYYY-MM-DD)')),
                const SizedBox(height: 8),
                TextField(controller: _start, decoration: const InputDecoration(labelText: 'Start time (HH:mm)')),
                const SizedBox(height: 8),
                TextField(controller: _end, decoration: const InputDecoration(labelText: 'End time (HH:mm)')),
                const SizedBox(height: 8),
                TextField(controller: _payMethod, decoration: const InputDecoration(labelText: 'Payment method (cash/card)')),
                const SizedBox(height: 8),
                TextField(controller: _card4, decoration: const InputDecoration(labelText: 'Card last 4 (if card)')),
                const SizedBox(height: 10),
                FilledButton(onPressed: _bookSession, child: const Text('Confirm booking')),
                const SizedBox(height: 24),
                Text('Subscription', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 10),
                FilledButton(onPressed: _subscribe, child: const Text('Subscribe to this gym')),
              ],
            ),
    );
  }
}
