import 'package:flutter/material.dart';

import '../../services/api_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/section_header.dart';

class SessionsScreen extends StatefulWidget {
  const SessionsScreen({super.key});

  @override
  State<SessionsScreen> createState() => _SessionsScreenState();
}

class _SessionsScreenState extends State<SessionsScreen> {
  final _api = ApiService.instance;

  bool _loading = true;
  List<Map<String, dynamic>> _sessions = [];
  DateTime _weekStart = _mondayOf(DateTime.now());
  String _statusFilter = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (!mounted) return;
    setState(() => _loading = true);
    try {
      final data = await _api.getSessions();
      _sessions = data
          .whereType<Map>()
          .map((m) => Map<String, dynamic>.from(m))
          .toList(growable: false);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  static DateTime _mondayOf(DateTime d) {
    final dateOnly = DateTime(d.year, d.month, d.day);
    final diff = dateOnly.weekday - DateTime.monday;
    return dateOnly.subtract(Duration(days: diff));
  }

  String _dateKey(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  Map<String, List<Map<String, dynamic>>> _groupByDate() {
    final map = <String, List<Map<String, dynamic>>>{};
    for (final s in _sessions) {
      if (_statusFilter.isNotEmpty && s['status'] != _statusFilter) continue;
      final raw = s['session_date']?.toString() ?? '';
      if (raw.length < 10) continue;
      final key = raw.substring(0, 10);
      (map[key] ??= <Map<String, dynamic>>[]).add(s);
    }
    for (final entry in map.entries) {
      entry.value.sort((a, b) =>
          (a['start_time']?.toString() ?? '').compareTo(b['start_time']?.toString() ?? ''));
    }
    return map;
  }

  void _moveWeek(int deltaWeeks) {
    setState(() {
      _weekStart = _weekStart.add(Duration(days: deltaWeeks * 7));
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final today = DateTime.now();
    final days = List.generate(7, (i) => _weekStart.add(Duration(days: i)));
    final grouped = _groupByDate();

    final endOfWeek = _weekStart.add(const Duration(days: 6));
    final rangeLabel =
        '${_monthShort(_weekStart.month)} ${_weekStart.day} – ${_monthShort(endOfWeek.month)} ${endOfWeek.day}, ${endOfWeek.year}';

    return RefreshIndicator(
      color: AppTheme.brand,
      onRefresh: _load,
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
            sliver: SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SectionHeader(eyebrow: 'Calendar', title: 'My Sessions'),
                  const SizedBox(height: 8),
                  Text(
                    'Weekly view of your booked, completed, and cancelled sessions.',
                    style: TextStyle(
                      color: isDark ? Colors.white60 : Colors.black54,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 16),
                  _FilterRow(
                    selected: _statusFilter,
                    onChanged: (v) => setState(() => _statusFilter = v),
                  ),
                  const SizedBox(height: 14),
                  _WeekControls(
                    label: rangeLabel,
                    onPrev: () => _moveWeek(-1),
                    onNext: () => _moveWeek(1),
                    onToday: () => setState(() => _weekStart = _mondayOf(DateTime.now())),
                  ),
                  const SizedBox(height: 12),
                ],
              ),
            ),
          ),
          if (_loading)
            const SliverFillRemaining(
              hasScrollBody: false,
              child: Center(child: CircularProgressIndicator()),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
              sliver: SliverList.separated(
                itemCount: days.length,
                separatorBuilder: (_, _) => const SizedBox(height: 10),
                itemBuilder: (context, i) {
                  final day = days[i];
                  final key = _dateKey(day);
                  final isToday = _dateKey(today) == key;
                  final sessions = grouped[key] ?? const [];
                  return _DayRow(
                    day: day,
                    isToday: isToday,
                    sessions: sessions,
                  );
                },
              ),
            ),
        ],
      ),
    );
  }

  String _monthShort(int m) {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return months[m - 1];
  }
}

class _FilterRow extends StatelessWidget {
  const _FilterRow({required this.selected, required this.onChanged});

  final String selected;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    const options = [
      {'value': '', 'label': 'All'},
      {'value': 'booked', 'label': 'Booked'},
      {'value': 'completed', 'label': 'Completed'},
      {'value': 'cancelled', 'label': 'Cancelled'},
    ];
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          for (final opt in options) ...[
            _FilterChip(
              label: opt['label']!,
              selected: selected == opt['value'],
              onTap: () => onChanged(opt['value']!),
            ),
            const SizedBox(width: 8),
          ],
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({required this.label, required this.selected, required this.onTap});

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: selected
              ? AppTheme.brand
              : (isDark ? const Color(0xFF1F1F1F) : Colors.white),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected
                ? AppTheme.brand
                : (isDark ? const Color(0xFF2D2D2D) : const Color(0xFFE7E5E4)),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: selected
                ? Colors.white
                : (isDark ? Colors.white70 : Colors.black87),
          ),
        ),
      ),
    );
  }
}

class _WeekControls extends StatelessWidget {
  const _WeekControls({
    required this.label,
    required this.onPrev,
    required this.onNext,
    required this.onToday,
  });

  final String label;
  final VoidCallback onPrev;
  final VoidCallback onNext;
  final VoidCallback onToday;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF171717) : Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isDark ? const Color(0xFF262626) : const Color(0xFFEDEDED),
        ),
      ),
      child: Row(
        children: [
          IconButton(
            tooltip: 'Previous week',
            onPressed: onPrev,
            icon: const Icon(Icons.chevron_left_rounded),
          ),
          Expanded(
            child: GestureDetector(
              onTap: onToday,
              child: Center(
                child: Text(
                  label,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                ),
              ),
            ),
          ),
          IconButton(
            tooltip: 'Next week',
            onPressed: onNext,
            icon: const Icon(Icons.chevron_right_rounded),
          ),
        ],
      ),
    );
  }
}

class _DayRow extends StatelessWidget {
  const _DayRow({
    required this.day,
    required this.isToday,
    required this.sessions,
  });

  final DateTime day;
  final bool isToday;
  final List<Map<String, dynamic>> sessions;

  static const _weekdayShort = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final dayName = _weekdayShort[day.weekday - 1];

    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF171717) : Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isToday
              ? AppTheme.brand.withValues(alpha: 0.5)
              : (isDark ? const Color(0xFF262626) : const Color(0xFFEDEDED)),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            width: 72,
            padding: const EdgeInsets.symmetric(vertical: 14),
            decoration: BoxDecoration(
              color: isToday
                  ? AppTheme.brand.withValues(alpha: 0.12)
                  : (isDark ? const Color(0xFF1F1F1F) : const Color(0xFFFAFAF9)),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(18),
                bottomLeft: Radius.circular(18),
              ),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  dayName.toUpperCase(),
                  style: TextStyle(
                    fontSize: 10,
                    letterSpacing: 1.2,
                    fontWeight: FontWeight.w700,
                    color: isToday
                        ? AppTheme.brand
                        : (isDark ? Colors.white54 : Colors.black45),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${day.day}',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: isToday
                        ? AppTheme.brand
                        : (isDark ? Colors.white : Colors.black87),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
              child: sessions.isEmpty
                  ? Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Text(
                        'No sessions',
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? Colors.white38 : Colors.black38,
                        ),
                      ),
                    )
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        for (int i = 0; i < sessions.length; i++) ...[
                          _SessionTile(session: sessions[i]),
                          if (i != sessions.length - 1) const SizedBox(height: 8),
                        ],
                      ],
                    ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SessionTile extends StatelessWidget {
  const _SessionTile({required this.session});

  final Map<String, dynamic> session;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final status = (session['status'] ?? '').toString();
    final meta = _statusMeta(status, isDark);

    final start = (session['start_time'] ?? '').toString();
    final end = (session['end_time'] ?? '').toString();
    final gymName = session['gym_name']?.toString() ?? 'Gym';
    final coachFirst = session['coach_first_name']?.toString() ?? '';
    final coachLast = session['coach_last_name']?.toString() ?? '';
    final coach = (coachFirst.isEmpty && coachLast.isEmpty)
        ? 'No coach'
        : '${coachFirst.trim()} ${coachLast.trim()}'.trim();

    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: meta.bg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: meta.border),
      ),
      child: Row(
        children: [
          Container(
            width: 6,
            height: 36,
            decoration: BoxDecoration(
              color: meta.dot,
              borderRadius: BorderRadius.circular(3),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${_hhmm(start)} – ${_hhmm(end)}',
                  style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w800,
                    color: meta.fg,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  gymName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? Colors.white70 : Colors.black87,
                  ),
                ),
                Text(
                  coach,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 11,
                    color: isDark ? Colors.white54 : Colors.black45,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: meta.dot.withValues(alpha: 0.16),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              meta.label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w700,
                color: meta.fg,
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _hhmm(String raw) {
    if (raw.length >= 5) return raw.substring(0, 5);
    return raw;
  }

  _StatusMeta _statusMeta(String status, bool isDark) {
    switch (status) {
      case 'booked':
        return _StatusMeta(
          bg: isDark
              ? const Color(0xFF172554).withValues(alpha: 0.35)
              : const Color(0xFFEFF6FF),
          border: const Color(0xFF3B82F6).withValues(alpha: 0.35),
          fg: const Color(0xFF3B82F6),
          dot: const Color(0xFF3B82F6),
          label: 'Booked',
        );
      case 'completed':
        return _StatusMeta(
          bg: isDark
              ? const Color(0xFF064E3B).withValues(alpha: 0.3)
              : const Color(0xFFECFDF5),
          border: const Color(0xFF10B981).withValues(alpha: 0.35),
          fg: const Color(0xFF10B981),
          dot: const Color(0xFF10B981),
          label: 'Done',
        );
      case 'cancelled':
        return _StatusMeta(
          bg: isDark
              ? const Color(0xFF7F1D1D).withValues(alpha: 0.3)
              : const Color(0xFFFEF2F2),
          border: const Color(0xFFEF4444).withValues(alpha: 0.3),
          fg: const Color(0xFFEF4444),
          dot: const Color(0xFFEF4444),
          label: 'Cancelled',
        );
      default:
        return _StatusMeta(
          bg: isDark ? const Color(0xFF1F1F1F) : const Color(0xFFF5F5F4),
          border: const Color(0xFF78716C).withValues(alpha: 0.2),
          fg: isDark ? Colors.white : Colors.black87,
          dot: const Color(0xFF78716C),
          label: status.isEmpty ? 'Unknown' : status,
        );
    }
  }
}

class _StatusMeta {
  _StatusMeta({
    required this.bg,
    required this.border,
    required this.fg,
    required this.dot,
    required this.label,
  });

  final Color bg;
  final Color border;
  final Color fg;
  final Color dot;
  final String label;
}
