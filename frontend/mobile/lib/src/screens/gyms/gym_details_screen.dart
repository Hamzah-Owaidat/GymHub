import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../services/api_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/image_utils.dart';

class GymDetailsScreen extends StatefulWidget {
  const GymDetailsScreen({super.key, required this.gymId});
  final int gymId;

  @override
  State<GymDetailsScreen> createState() => _GymDetailsScreenState();
}

class _GymDetailsScreenState extends State<GymDetailsScreen> {
  final _api = ApiService.instance;

  bool _loading = true;
  bool _subscribing = false;
  bool _booking = false;

  Map<String, dynamic>? _gym;
  List<Map<String, dynamic>> _plans = [];
  List<Map<String, dynamic>> _coaches = [];
  List<Map<String, dynamic>> _images = [];
  Map<String, dynamic>? _activeSub;
  int _currentImage = 0;
  final _imagePage = PageController();

  int? _selectedPlanId;
  String _subPayMethod = 'cash';

  int? _selectedCoachId;
  final _dateCtrl = TextEditingController();
  final _startCtrl = TextEditingController();
  final _endCtrl = TextEditingController();
  String _bookPayMethod = 'cash';
  String _visibility = 'private';
  final _card4 = TextEditingController();

  static final _dateFmt = DateFormat('yyyy-MM-dd');

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _dateCtrl.dispose();
    _startCtrl.dispose();
    _endCtrl.dispose();
    _card4.dispose();
    _imagePage.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await _api.getGymDetails(widget.gymId);
      _gym = data['gym'] is Map ? Map<String, dynamic>.from(data['gym'] as Map) : null;
      _plans = (data['plans'] as List? ?? [])
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();
      _coaches = (data['coaches'] as List? ?? [])
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();
      _images = (data['images'] as List? ?? [])
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
      _activeSub = data['activeSubscription'] is Map
          ? Map<String, dynamic>.from(data['activeSubscription'] as Map)
          : null;
    } catch (e) {
      if (mounted) _snack(e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _snack(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: now,
      firstDate: now,
      lastDate: now.add(const Duration(days: 365)),
    );
    if (picked != null) {
      _dateCtrl.text = _dateFmt.format(picked);
      setState(() {});
    }
  }

  Future<void> _pickTime(TextEditingController ctrl) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.now(),
    );
    if (picked != null) {
      ctrl.text =
          '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}';
      setState(() {});
    }
  }

  Future<void> _subscribe() async {
    if (_selectedPlanId == null) {
      _snack('Select a plan first');
      return;
    }
    if (_subPayMethod == 'card' && _card4.text.trim().length < 4) {
      _snack('Enter the last 4 digits of your card');
      return;
    }
    setState(() => _subscribing = true);
    try {
      await _api.subscribe(
        planId: _selectedPlanId!,
        paymentMethod: _subPayMethod,
        cardLast4: _subPayMethod == 'card' ? _card4.text.trim() : null,
      );
      if (mounted) _snack('Subscription created');
      await _load();
    } catch (e) {
      if (mounted) _snack(e.toString());
    } finally {
      if (mounted) setState(() => _subscribing = false);
    }
  }

  Future<void> _bookSession() async {
    if (_selectedCoachId == null) {
      _snack('Select a coach');
      return;
    }
    if (_dateCtrl.text.isEmpty || _startCtrl.text.isEmpty || _endCtrl.text.isEmpty) {
      _snack('Fill date, start time and end time');
      return;
    }

    // Don't allow a start time that has already passed today.
    final now = DateTime.now();
    final today = _dateFmt.format(now);
    if (_dateCtrl.text == today) {
      final parts = _startCtrl.text.split(':');
      if (parts.length == 2) {
        final h = int.tryParse(parts[0]) ?? 0;
        final m = int.tryParse(parts[1]) ?? 0;
        final nowMin = now.hour * 60 + now.minute;
        if (h * 60 + m < nowMin) {
          _snack('Start time is already in the past');
          return;
        }
      }
    }

    if (_bookPayMethod == 'card' && _card4.text.trim().length < 4) {
      _snack('Enter the last 4 digits of your card');
      return;
    }

    setState(() => _booking = true);
    try {
      final res = await _api.bookSession({
        'gym_id': widget.gymId,
        'coach_id': _selectedCoachId,
        'session_date': _dateCtrl.text,
        'start_time': _startCtrl.text,
        'end_time': _endCtrl.text,
        'session_visibility': _visibility,
        'payment_method': _bookPayMethod,
        if (_bookPayMethod == 'card' && _card4.text.trim().isNotEmpty)
          'card_last4': _card4.text.trim(),
      });
      if (!mounted) return;
      final amount = res['amount_charged'];
      final needsPay = res['payment_required'] == true;
      _snack(needsPay
          ? 'Session booked. Charged \$${amount ?? 0}'
          : 'Session booked (covered by subscription)');
    } catch (e) {
      if (mounted) _snack(e.toString());
    } finally {
      if (mounted) setState(() => _booking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Gym Details')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    final gymName = _gym?['name']?.toString() ?? 'Gym';
    final description = _gym?['description']?.toString() ?? '';
    final location = _gym?['location']?.toString() ?? '';
    final ratingRaw = _gym?['rating_average'];
    final rating = ratingRaw == null ? null : double.tryParse(ratingRaw.toString());

    return Scaffold(
      appBar: AppBar(title: Text(gymName)),
      body: RefreshIndicator(
        color: AppTheme.brand,
        onRefresh: _load,
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            _buildImageHero(),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    gymName,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                  if (location.isNotEmpty || rating != null) ...[
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        if (location.isNotEmpty)
                          _metaPill(
                            icon: Icons.location_on_outlined,
                            label: location,
                          ),
                        if (rating != null)
                          _metaPill(
                            icon: Icons.star_rounded,
                            label: rating.toStringAsFixed(1),
                            iconColor: AppTheme.amber,
                          ),
                      ],
                    ),
                  ],
                  if (description.isNotEmpty) ...[
                    const SizedBox(height: 14),
                    Text(
                      description,
                      style: TextStyle(
                        height: 1.5,
                        color: Theme.of(context).brightness == Brightness.dark
                            ? Colors.white70
                            : Colors.black87,
                      ),
                    ),
                  ],
                  if (_activeSub != null) ...[
                    const SizedBox(height: 16),
                    _buildActiveSubBanner(),
                  ],
                  const SizedBox(height: 22),
                  _buildSubscribeSection(),
                  const SizedBox(height: 18),
                  _buildBookingSection(),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildImageHero() {
    final urls = _images
        .map((m) => resolveGymImageUrl(m['image_url']?.toString()))
        .whereType<String>()
        .toList();

    return SizedBox(
      height: 220,
      child: urls.isEmpty
          ? _imagePlaceholder()
          : Stack(
              children: [
                PageView.builder(
                  controller: _imagePage,
                  onPageChanged: (i) => setState(() => _currentImage = i),
                  itemCount: urls.length,
                  itemBuilder: (_, i) {
                    return Image.network(
                      urls[i],
                      fit: BoxFit.cover,
                      width: double.infinity,
                      errorBuilder: (_, __, ___) => _imagePlaceholder(),
                    );
                  },
                ),
                const Positioned.fill(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [Colors.transparent, Color(0x66000000)],
                      ),
                    ),
                  ),
                ),
                if (urls.length > 1)
                  Positioned(
                    bottom: 12,
                    left: 0,
                    right: 0,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(urls.length, (i) {
                        final active = i == _currentImage;
                        return AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          margin: const EdgeInsets.symmetric(horizontal: 3),
                          width: active ? 18 : 6,
                          height: 6,
                          decoration: BoxDecoration(
                            color: active
                                ? Colors.white
                                : Colors.white.withValues(alpha: 0.5),
                            borderRadius: BorderRadius.circular(3),
                          ),
                        );
                      }),
                    ),
                  ),
              ],
            ),
    );
  }

  Widget _imagePlaceholder() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      color: isDark ? const Color(0xFF1F1F1F) : const Color(0xFFF5F5F4),
      alignment: Alignment.center,
      child: Icon(
        Icons.fitness_center_rounded,
        size: 52,
        color: isDark ? Colors.white24 : Colors.black26,
      ),
    );
  }

  Widget _metaPill({required IconData icon, required String label, Color? iconColor}) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1F1F1F) : const Color(0xFFF5F5F4),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark ? const Color(0xFF2D2D2D) : const Color(0xFFE7E5E4),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: iconColor ?? (isDark ? Colors.white70 : Colors.black54)),
          const SizedBox(width: 5),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: isDark ? Colors.white70 : Colors.black87,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActiveSubBanner() {
    final endRaw = _activeSub?['end_date']?.toString();
    String end = '';
    if (endRaw != null && endRaw.isNotEmpty) {
      final d = DateTime.tryParse(endRaw);
      end = d != null ? DateFormat('MMM d, y').format(d) : endRaw;
    }
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      decoration: BoxDecoration(
        color: const Color(0xFF10B981).withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.35)),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: const Color(0xFF10B981).withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.verified_rounded, color: Color(0xFF10B981)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Active subscription',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                ),
                const SizedBox(height: 2),
                Text(
                  end.isEmpty ? 'You can book sessions at this gym.' : 'Valid until $end',
                  style: TextStyle(
                    fontSize: 12,
                    color: Theme.of(context).brightness == Brightness.dark
                        ? Colors.white60
                        : Colors.black54,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSubscribeSection() {
    if (_plans.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Text(
            'No active plans for this gym.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ),
      );
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Subscribe', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            ..._plans.map((plan) {
              final id = plan['id'] as int;
              return RadioListTile<int>(
                value: id,
                groupValue: _selectedPlanId,
                onChanged: _activeSub != null
                    ? null
                    : (v) => setState(() => _selectedPlanId = v),
                title: Text('${plan['name'] ?? 'Plan'} — \$${plan['price'] ?? 0}'),
                subtitle: Text('${plan['duration_days'] ?? 0} days'),
              );
            }),
            const SizedBox(height: 8),
            _paymentSelector(
              value: _subPayMethod,
              onChanged: (v) => setState(() => _subPayMethod = v),
            ),
            if (_subPayMethod == 'card') ...[
              const SizedBox(height: 8),
              TextField(
                controller: _card4,
                keyboardType: TextInputType.number,
                maxLength: 4,
                decoration: const InputDecoration(
                  labelText: 'Card last 4',
                  counterText: '',
                ),
              ),
            ],
            const SizedBox(height: 12),
            FilledButton(
              onPressed: _activeSub != null || _subscribing ? null : _subscribe,
              child: Text(_activeSub != null
                  ? 'Already subscribed'
                  : (_subscribing ? 'Subscribing...' : 'Subscribe')),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBookingSection() {
    if (_coaches.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Text(
            'No coaches available at this gym.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ),
      );
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Book a Session', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            DropdownButtonFormField<int>(
              initialValue: _selectedCoachId,
              decoration: const InputDecoration(labelText: 'Coach'),
              items: _coaches.map((c) {
                final id = c['id'] as int;
                final name =
                    '${c['user_first_name'] ?? ''} ${c['user_last_name'] ?? ''}'.trim();
                final price = c['price_per_session'];
                return DropdownMenuItem<int>(
                  value: id,
                  child: Text(name.isEmpty
                      ? 'Coach #$id'
                      : '$name${price != null ? ' — \$$price' : ''}'),
                );
              }).toList(),
              onChanged: (v) => setState(() => _selectedCoachId = v),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _dateCtrl,
              readOnly: true,
              onTap: _pickDate,
              decoration: const InputDecoration(
                labelText: 'Date',
                suffixIcon: Icon(Icons.calendar_today_outlined),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _startCtrl,
                    readOnly: true,
                    onTap: () => _pickTime(_startCtrl),
                    decoration: const InputDecoration(
                      labelText: 'Start',
                      suffixIcon: Icon(Icons.schedule),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: _endCtrl,
                    readOnly: true,
                    onTap: () => _pickTime(_endCtrl),
                    decoration: const InputDecoration(
                      labelText: 'End',
                      suffixIcon: Icon(Icons.schedule),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _visibilitySelector(),
            const SizedBox(height: 8),
            _paymentSelector(
              value: _bookPayMethod,
              onChanged: (v) => setState(() => _bookPayMethod = v),
            ),
            if (_bookPayMethod == 'card') ...[
              const SizedBox(height: 8),
              TextField(
                controller: _card4,
                keyboardType: TextInputType.number,
                maxLength: 4,
                decoration: const InputDecoration(
                  labelText: 'Card last 4',
                  counterText: '',
                ),
              ),
            ],
            const SizedBox(height: 12),
            FilledButton(
              onPressed: _booking ? null : _bookSession,
              child: Text(_booking ? 'Booking...' : 'Confirm booking'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _paymentSelector({
    required String value,
    required ValueChanged<String> onChanged,
  }) {
    return Row(
      children: [
        Expanded(
          child: RadioListTile<String>(
            dense: true,
            contentPadding: EdgeInsets.zero,
            value: 'cash',
            groupValue: value,
            onChanged: (v) => onChanged(v!),
            title: const Text('Cash'),
          ),
        ),
        Expanded(
          child: RadioListTile<String>(
            dense: true,
            contentPadding: EdgeInsets.zero,
            value: 'card',
            groupValue: value,
            onChanged: (v) => onChanged(v!),
            title: const Text('Card'),
          ),
        ),
      ],
    );
  }

  Widget _visibilitySelector() {
    return Row(
      children: [
        Expanded(
          child: RadioListTile<String>(
            dense: true,
            contentPadding: EdgeInsets.zero,
            value: 'private',
            groupValue: _visibility,
            onChanged: (v) => setState(() => _visibility = v!),
            title: const Text('Private'),
          ),
        ),
        Expanded(
          child: RadioListTile<String>(
            dense: true,
            contentPadding: EdgeInsets.zero,
            value: 'public',
            groupValue: _visibility,
            onChanged: (v) => setState(() => _visibility = v!),
            title: const Text('Public'),
          ),
        ),
      ],
    );
  }
}
