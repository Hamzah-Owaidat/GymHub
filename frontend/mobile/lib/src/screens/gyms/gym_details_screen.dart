import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../providers/auth_provider.dart';
import '../../routes/app_router.dart';
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
  static const int _bookingLeadMinutes = 5;

  bool _loading = true;
  bool _subscribing = false;
  bool _booking = false;
  bool _availabilityLoading = false;

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
  Map<String, dynamic>? _availabilityInfo;
  Set<int> _coachAvailableWeekdays = const {};

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
    if (_selectedCoachId == null) {
      _snack('Select a coach first');
      return;
    }
    final now = DateTime.now();
    final firstDate = DateTime(now.year, now.month, now.day);
    final lastDate = firstDate.add(const Duration(days: 365));
    final preferredInitial = _dateCtrl.text.isNotEmpty ? DateTime.tryParse(_dateCtrl.text) : null;
    final initialDate = _firstSelectableDate(
      firstDate: firstDate,
      lastDate: lastDate,
      preferred: preferredInitial,
    );
    if (initialDate == null) {
      _snack('No available dates for this coach');
      return;
    }
    final picked = await showDatePicker(
      context: context,
      initialDate: initialDate,
      firstDate: firstDate,
      lastDate: lastDate,
      selectableDayPredicate: _isDateSelectable,
    );
    if (picked != null) {
      _dateCtrl.text = _dateFmt.format(picked);
      _startCtrl.clear();
      _endCtrl.clear();
      setState(() {});
      await _loadAvailabilityForDate(_dateCtrl.text);
    }
  }

  DateTime? _firstSelectableDate({
    required DateTime firstDate,
    required DateTime lastDate,
    DateTime? preferred,
  }) {
    DateTime normalize(DateTime d) => DateTime(d.year, d.month, d.day);

    if (preferred != null) {
      final p = normalize(preferred);
      if (!p.isBefore(firstDate) && !p.isAfter(lastDate) && _isDateSelectable(p)) {
        return p;
      }
    }

    var cursor = firstDate;
    while (!cursor.isAfter(lastDate)) {
      if (_isDateSelectable(cursor)) return cursor;
      cursor = cursor.add(const Duration(days: 1));
    }
    return null;
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

  Future<void> _loadAvailabilityForDate(String date) async {
    if (_selectedCoachId == null || date.isEmpty) return;
    setState(() => _availabilityLoading = true);
    try {
      final data = await _api.getCoachAvailability(
        coachId: _selectedCoachId!,
        gymId: widget.gymId,
        date: date,
      );
      if (!mounted) return;
      _availabilityInfo = data;
      final starts = _availableStartOptions();
      if (_startCtrl.text.isNotEmpty && !starts.contains(_startCtrl.text)) {
        _startCtrl.clear();
        _endCtrl.clear();
      }
      final ends = _availableEndOptions();
      if (_endCtrl.text.isNotEmpty && !ends.contains(_endCtrl.text)) {
        _endCtrl.clear();
      }
      setState(() {});
    } catch (e) {
      if (!mounted) return;
      _availabilityInfo = null;
      _snack(e.toString());
      setState(() {});
    } finally {
      if (mounted) setState(() => _availabilityLoading = false);
    }
  }

  Set<int> _extractCoachWeekdays(int? coachId) {
    if (coachId == null) return const {};
    final coach = _coaches.cast<Map<String, dynamic>?>().firstWhere(
          (c) => c?['id'] == coachId,
          orElse: () => null,
        );
    final availability = (coach?['availability'] as List?) ?? const [];
    final days = <int>{};
    for (final slot in availability) {
      if (slot is! Map) continue;
      final d = _weekdayFromName(slot['day']?.toString());
      if (d != null) days.add(d);
    }
    return days;
  }

  int? _weekdayFromName(String? raw) {
    if (raw == null) return null;
    switch (raw.trim().toLowerCase()) {
      case 'monday':
      case 'mon':
        return DateTime.monday;
      case 'tuesday':
      case 'tue':
      case 'tues':
        return DateTime.tuesday;
      case 'wednesday':
      case 'wed':
        return DateTime.wednesday;
      case 'thursday':
      case 'thu':
      case 'thur':
      case 'thurs':
        return DateTime.thursday;
      case 'friday':
      case 'fri':
        return DateTime.friday;
      case 'saturday':
      case 'sat':
        return DateTime.saturday;
      case 'sunday':
      case 'sun':
        return DateTime.sunday;
      default:
        return null;
    }
  }

  bool _isDateSelectable(DateTime day) {
    final today = DateTime.now();
    final dayOnly = DateTime(day.year, day.month, day.day);
    final todayOnly = DateTime(today.year, today.month, today.day);
    if (dayOnly.isBefore(todayOnly)) return false;
    if (_coachAvailableWeekdays.isEmpty) return true;
    return _coachAvailableWeekdays.contains(day.weekday);
  }

  int? _toMinutes(String hhmm) {
    final p = hhmm.split(':');
    if (p.length != 2) return null;
    final h = int.tryParse(p[0]);
    final m = int.tryParse(p[1]);
    if (h == null || m == null) return null;
    return h * 60 + m;
  }

  String _minuteToTime(int minute) {
    final h = (minute ~/ 60).toString().padLeft(2, '0');
    final m = (minute % 60).toString().padLeft(2, '0');
    return '$h:$m';
  }

  int _minStartMinuteForSelectedDate() {
    if (_dateCtrl.text.isEmpty) return -99999;
    final now = DateTime.now();
    final todayIso = _dateFmt.format(now);
    if (_dateCtrl.text != todayIso) return -99999;
    return now.hour * 60 + now.minute + _bookingLeadMinutes;
  }

  List<String> _availableStartOptions() {
    final windows = (_availabilityInfo?['available_windows'] as List?) ?? const [];
    final options = <String>[];
    final minStart = _minStartMinuteForSelectedDate();
    for (final w in windows) {
      if (w is! Map) continue;
      final s = _toMinutes('${w['start_time'] ?? ''}');
      final e = _toMinutes('${w['end_time'] ?? ''}');
      if (s == null || e == null) continue;
      for (int current = s; current + 30 <= e; current += 30) {
        if (current < minStart) continue;
        options.add(_minuteToTime(current));
      }
    }
    return options.toSet().toList()..sort();
  }

  List<String> _availableEndOptions() {
    if (_startCtrl.text.isEmpty) return const [];
    final start = _toMinutes(_startCtrl.text);
    if (start == null) return const [];
    final windows = (_availabilityInfo?['available_windows'] as List?) ?? const [];
    final options = <String>[];
    for (final w in windows) {
      if (w is! Map) continue;
      final s = _toMinutes('${w['start_time'] ?? ''}');
      final e = _toMinutes('${w['end_time'] ?? ''}');
      if (s == null || e == null) continue;
      if (start < s || start >= e) continue;
      for (int current = start + 30; current <= e; current += 30) {
        options.add(_minuteToTime(current));
      }
    }
    return options.toSet().toList()..sort();
  }

  @override
  Widget build(BuildContext context) {
    final isAuthenticated = context.watch<AuthProvider>().isAuthenticated;

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
                  _buildSubscribeSection(isAuthenticated: isAuthenticated),
                  const SizedBox(height: 18),
                  _buildBookingSection(isAuthenticated: isAuthenticated),
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
                      errorBuilder: (_, _, _) => _imagePlaceholder(),
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

  Widget _buildSubscribeSection({required bool isAuthenticated}) {
    if (!isAuthenticated) {
      return _authRequiredCard(
        title: 'Subscribe',
        message: 'Sign in to subscribe to this gym and unlock member benefits.',
      );
    }

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

  Widget _buildBookingSection({required bool isAuthenticated}) {
    if (!isAuthenticated) {
      return _authRequiredCard(
        title: 'Book a Session',
        message: 'Sign in to book sessions with coaches at this gym.',
      );
    }

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

    final startOptions = _availableStartOptions();
    final endOptions = _availableEndOptions();
    final weekdayHint = _coachAvailableWeekdays.isEmpty
        ? 'This coach has no fixed weekly days. You can pick any future date.'
        : 'Pick one of this coach days: ${_coachAvailableWeekdays.map(_weekdayLabel).join(', ')}';

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
              onChanged: (v) {
                _selectedCoachId = v;
                _coachAvailableWeekdays = _extractCoachWeekdays(v);
                _dateCtrl.clear();
                _startCtrl.clear();
                _endCtrl.clear();
                _availabilityInfo = null;
                setState(() {});
              },
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _dateCtrl,
              readOnly: true,
              onTap: _pickDate,
              decoration: InputDecoration(
                labelText: 'Date',
                helperText: weekdayHint,
                suffixIcon: Icon(Icons.calendar_today_outlined),
              ),
            ),
            const SizedBox(height: 8),
            if (_availabilityLoading)
              const Padding(
                padding: EdgeInsets.only(bottom: 8),
                child: LinearProgressIndicator(minHeight: 3),
              ),
            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    initialValue: _startCtrl.text.isEmpty ? null : _startCtrl.text,
                    decoration: const InputDecoration(
                      labelText: 'Start',
                      suffixIcon: Icon(Icons.schedule),
                    ),
                    items: startOptions
                        .map((t) => DropdownMenuItem<String>(value: t, child: Text(t)))
                        .toList(),
                    onChanged: _availabilityLoading || startOptions.isEmpty
                        ? null
                        : (v) {
                            _startCtrl.text = v ?? '';
                            _endCtrl.clear();
                            setState(() {});
                          },
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    initialValue: _endCtrl.text.isEmpty ? null : _endCtrl.text,
                    decoration: const InputDecoration(
                      labelText: 'End',
                      suffixIcon: Icon(Icons.schedule),
                    ),
                    items: endOptions
                        .map((t) => DropdownMenuItem<String>(value: t, child: Text(t)))
                        .toList(),
                    onChanged: _availabilityLoading || endOptions.isEmpty
                        ? null
                        : (v) {
                            _endCtrl.text = v ?? '';
                            setState(() {});
                          },
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

  Widget _authRequiredCard({required String title, required String message}) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(
              message,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: () => Navigator.pushNamed(context, AppRouter.signIn),
              icon: const Icon(Icons.login_rounded),
              label: const Text('Login to continue'),
            ),
          ],
        ),
      ),
    );
  }

  String _weekdayLabel(int weekday) {
    switch (weekday) {
      case DateTime.monday:
        return 'Mon';
      case DateTime.tuesday:
        return 'Tue';
      case DateTime.wednesday:
        return 'Wed';
      case DateTime.thursday:
        return 'Thu';
      case DateTime.friday:
        return 'Fri';
      case DateTime.saturday:
        return 'Sat';
      case DateTime.sunday:
        return 'Sun';
      default:
        return '?';
    }
  }
}
