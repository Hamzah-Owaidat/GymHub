import 'package:flutter/material.dart';

import '../../routes/app_router.dart';
import '../../services/api_service.dart';

class GymsScreen extends StatefulWidget {
  const GymsScreen({super.key});

  @override
  State<GymsScreen> createState() => _GymsScreenState();
}

class _GymsScreenState extends State<GymsScreen> {
  final _api = ApiService.instance;
  bool _loading = true;
  List<dynamic> _gyms = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      _gyms = await _api.getGyms();
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
        itemCount: _gyms.length,
        itemBuilder: (_, i) {
          final gym = _gyms[i] as Map<String, dynamic>;
          return Card(
            child: ListTile(
              title: Text(gym['name']?.toString() ?? 'Gym'),
              subtitle: Text(gym['location']?.toString() ?? ''),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => Navigator.pushNamed(context, AppRouter.gymDetails, arguments: gym['id'] as int),
            ),
          );
        },
      ),
    );
  }
}
