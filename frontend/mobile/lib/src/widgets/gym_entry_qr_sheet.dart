import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../services/api_service.dart';

/// Bottom sheet showing the member's gym entry QR code.
Future<void> showGymEntryQrSheet(
  BuildContext context, {
  required int subscriptionId,
  String? gymName,
}) async {
  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Theme.of(context).scaffoldBackgroundColor,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (ctx) => _GymEntryQrSheet(
      subscriptionId: subscriptionId,
      gymName: gymName,
    ),
  );
}

class _GymEntryQrSheet extends StatefulWidget {
  const _GymEntryQrSheet({
    required this.subscriptionId,
    this.gymName,
  });

  final int subscriptionId;
  final String? gymName;

  @override
  State<_GymEntryQrSheet> createState() => _GymEntryQrSheetState();
}

class _GymEntryQrSheetState extends State<_GymEntryQrSheet> {
  final _api = ApiService.instance;

  bool _loading = true;
  String? _error;
  String? _qrPayload;
  String? _planName;
  String? _endDate;
  String? _gymName;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await _api.getSubscriptionEntryQr(widget.subscriptionId);
      if (!mounted) return;
      setState(() {
        _qrPayload = data['qr_payload']?.toString();
        _planName = data['plan_name']?.toString();
        _endDate = data['end_date']?.toString();
        _gymName = data['gym_name']?.toString() ?? widget.gymName;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Padding(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 28,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: isDark ? Colors.white24 : Colors.black12,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'Gym entry QR',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            'Show this code at the entrance. Staff will scan it to let you in.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 13,
              color: isDark ? Colors.white60 : Colors.black54,
            ),
          ),
          const SizedBox(height: 24),
          if (_loading)
            const Padding(
              padding: EdgeInsets.all(32),
              child: CircularProgressIndicator(),
            )
          else if (_error != null)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: Column(
                children: [
                  Text(_error!, textAlign: TextAlign.center),
                  const SizedBox(height: 12),
                  FilledButton(onPressed: _load, child: const Text('Retry')),
                ],
              ),
            )
          else if (_qrPayload != null && _qrPayload!.isNotEmpty) ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.08),
                    blurRadius: 24,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: QrImageView(
                data: _qrPayload!,
                version: QrVersions.auto,
                size: 220,
                backgroundColor: Colors.white,
              ),
            ),
            if (_gymName != null && _gymName!.isNotEmpty) ...[
              const SizedBox(height: 16),
              Text(
                _gymName!,
                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
              ),
            ],
            if (_planName != null) ...[
              const SizedBox(height: 4),
              Text(
                _planName!,
                style: TextStyle(
                  fontSize: 13,
                  color: isDark ? Colors.white54 : Colors.black54,
                ),
              ),
            ],
            if (_endDate != null && _endDate!.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                'Valid until ${_formatDate(_endDate!)}',
                style: TextStyle(
                  fontSize: 12,
                  color: isDark ? Colors.white38 : Colors.black45,
                ),
              ),
            ],
          ],
          const SizedBox(height: 8),
        ],
      ),
    );
  }

  String _formatDate(String raw) {
    final d = DateTime.tryParse(raw);
    if (d == null) return raw;
    return '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
  }
}
