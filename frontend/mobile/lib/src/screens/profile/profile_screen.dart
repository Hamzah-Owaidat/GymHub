import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/auth_provider.dart';
import '../../routes/app_router.dart';
import '../../services/api_service.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _api = ApiService.instance;
  bool _loading = true;
  List<dynamic> _cards = [];

  final _label = TextEditingController();
  final _holder = TextEditingController();
  final _last4 = TextEditingController();
  final _expiry = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadCards();
  }

  Future<void> _loadCards() async {
    setState(() => _loading = true);
    try {
      _cards = await _api.getCards();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _addCard() async {
    try {
      await _api.createCard({
        'card_label': _label.text.trim().isEmpty ? 'My Card' : _label.text.trim(),
        'card_holder': _holder.text.trim(),
        'card_last4': _last4.text.trim(),
        'card_expiry': _expiry.text.trim(),
      });
      _label.clear();
      _holder.clear();
      _last4.clear();
      _expiry.clear();
      await _loadCards();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('${auth.user?['first_name'] ?? ''} ${auth.user?['last_name'] ?? ''}', style: Theme.of(context).textTheme.titleLarge),
        Text(auth.user?['email']?.toString() ?? ''),
        const SizedBox(height: 16),
        FilledButton.tonal(
          onPressed: () async {
            await context.read<AuthProvider>().logout();
            if (!context.mounted) return;
            Navigator.pushNamedAndRemoveUntil(context, AppRouter.signIn, (_) => false);
          },
          child: const Text('Logout'),
        ),
        const SizedBox(height: 20),
        Text('Saved Cards (max 2)', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 10),
        if (_loading) const Center(child: CircularProgressIndicator()),
        ..._cards.map((raw) {
          final c = raw as Map<String, dynamic>;
          return Card(
            child: ListTile(
              title: Text('${c['card_label'] ?? 'Card'} • **** ${c['card_last4'] ?? ''}'),
              subtitle: Text('Expiry: ${c['card_expiry'] ?? ''}'),
              trailing: Wrap(
                spacing: 4,
                children: [
                  IconButton(
                    onPressed: () async {
                      await _api.setDefaultCard(c['id'] as int);
                      _loadCards();
                    },
                    icon: const Icon(Icons.check_circle_outline),
                  ),
                  IconButton(
                    onPressed: () async {
                      await _api.deleteCard(c['id'] as int);
                      _loadCards();
                    },
                    icon: const Icon(Icons.delete_outline),
                  ),
                ],
              ),
            ),
          );
        }),
        const SizedBox(height: 12),
        TextField(controller: _label, decoration: const InputDecoration(labelText: 'Card label')),
        const SizedBox(height: 8),
        TextField(controller: _holder, decoration: const InputDecoration(labelText: 'Card holder')),
        const SizedBox(height: 8),
        TextField(controller: _last4, decoration: const InputDecoration(labelText: 'Card last 4')),
        const SizedBox(height: 8),
        TextField(controller: _expiry, decoration: const InputDecoration(labelText: 'Expiry MM/YY')),
        const SizedBox(height: 8),
        FilledButton(onPressed: _addCard, child: const Text('Add card')),
      ],
    );
  }
}
