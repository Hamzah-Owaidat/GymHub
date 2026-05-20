import 'package:flutter/material.dart';

import '../routes/app_router.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../utils/ai_profile_session.dart';

Future<void> showAiAssistantSheet(BuildContext context) async {
  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Theme.of(context).scaffoldBackgroundColor,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (ctx) => const _AiAssistantSheet(),
  );
}

class _AiAssistantSheet extends StatefulWidget {
  const _AiAssistantSheet();

  @override
  State<_AiAssistantSheet> createState() => _AiAssistantSheetState();
}

class _AiAssistantSheetState extends State<_AiAssistantSheet> {
  final _api = ApiService.instance;
  final _input = TextEditingController();
  final _scroll = ScrollController();
  final _ageFieldKey = GlobalKey();
  final _weightFieldKey = GlobalKey();
  final _heightFieldKey = GlobalKey();
  final _workFieldKey = GlobalKey();
  final _locationFieldKey = GlobalKey();
  final _budgetFieldKey = GlobalKey();
  final _goalsFieldKey = GlobalKey();

  bool _showProfile = true;
  bool _sending = false;
  String? _error;

  int? _age;
  double? _weight;
  int? _heightCm;
  String? _gender;
  String? _trainingType;
  String? _freeTime;
  final _ageCtrl = TextEditingController();
  final _weightCtrl = TextEditingController();
  final _heightCtrl = TextEditingController();
  final _workSchedule = TextEditingController();
  final _location = TextEditingController();
  final _maxBudget = TextEditingController();
  final _goals = TextEditingController();

  final List<_ChatEntry> _messages = [
    _ChatEntry(
      role: 'assistant',
      content:
          'Hi! I\'m your GymHub fitness assistant. Add your profile (optional), then ask me to pick a gym, coach, plan, or build a training plan.',
    ),
  ];

  static const _genders = [
    ('', 'Gender'),
    ('male', 'Male'),
    ('female', 'Female'),
    ('other', 'Other'),
    ('prefer_not_to_say', 'Prefer not to say'),
  ];

  static const _trainingTypes = [
    ('', 'Training type'),
    ('bodybuilding', 'Bodybuilding'),
    ('calisthenics', 'Calisthenics'),
    ('cardio', 'Cardio'),
    ('crossfit', 'CrossFit'),
    ('yoga', 'Yoga'),
    ('general_fitness', 'General fitness'),
    ('weight_loss', 'Weight loss'),
    ('strength', 'Strength'),
  ];

  static const _freeTimes = [
    ('', 'Free time'),
    ('early_morning', 'Early morning'),
    ('morning', 'Morning'),
    ('afternoon', 'Afternoon'),
    ('evening', 'Evening'),
    ('night', 'Night'),
    ('weekends', 'Weekends'),
    ('flexible', 'Flexible'),
  ];

  @override
  void initState() {
    super.initState();
    _hydrateProfileFromSession();
  }

  void _hydrateProfileFromSession() {
    final saved = AiProfileSession.load();
    if (saved == null) return;

    final ageRaw = saved['age'];
    if (ageRaw is int) {
      _age = ageRaw;
    } else if (ageRaw != null) {
      _age = int.tryParse(ageRaw.toString());
    }

    final weightRaw = saved['weight_kg'];
    if (weightRaw is num) {
      _weight = weightRaw.toDouble();
    } else if (weightRaw != null) {
      _weight = double.tryParse(weightRaw.toString());
    }

    final g = saved['gender']?.toString();
    if (g != null && g.isNotEmpty) _gender = g;

    final t = saved['training_type']?.toString();
    if (t != null && t.isNotEmpty) _trainingType = t;

    final f = saved['free_time']?.toString();
    if (f != null && f.isNotEmpty) _freeTime = f;

    if (_age != null) _ageCtrl.text = '$_age';
    if (_weight != null) _weightCtrl.text = '$_weight';

    final heightRaw = saved['height_cm'];
    if (heightRaw is int) {
      _heightCm = heightRaw;
    } else if (heightRaw != null) {
      _heightCm = int.tryParse(heightRaw.toString());
    }
    if (_heightCm != null) _heightCtrl.text = '$_heightCm';
    _workSchedule.text = saved['work_schedule']?.toString() ?? '';
    _location.text = saved['location']?.toString() ?? '';
    _maxBudget.text = saved['max_budget']?.toString() ?? '';
    _goals.text = saved['goals']?.toString() ?? '';
  }

  void _persistProfileToSession() {
    AiProfileSession.save({
      if (_age != null) 'age': _age,
      if (_weight != null) 'weight_kg': _weight,
      if (_heightCm != null) 'height_cm': _heightCm,
      if (_gender != null && _gender!.isNotEmpty) 'gender': _gender,
      if (_trainingType != null && _trainingType!.isNotEmpty) 'training_type': _trainingType,
      if (_freeTime != null && _freeTime!.isNotEmpty) 'free_time': _freeTime,
      'work_schedule': _workSchedule.text.trim(),
      'location': _location.text.trim(),
      'max_budget': _maxBudget.text.trim(),
      'goals': _goals.text.trim(),
    });
  }

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    _ageCtrl.dispose();
    _weightCtrl.dispose();
    _heightCtrl.dispose();
    _workSchedule.dispose();
    _location.dispose();
    _maxBudget.dispose();
    _goals.dispose();
    super.dispose();
  }

  Map<String, dynamic>? _profilePayload() {
    final p = <String, dynamic>{};
    if (_age != null) p['age'] = _age;
    if (_weight != null) p['weight_kg'] = _weight;
    if (_heightCm != null) p['height_cm'] = _heightCm;
    if (_gender != null && _gender!.isNotEmpty) p['gender'] = _gender;
    if (_trainingType != null && _trainingType!.isNotEmpty) {
      p['training_type'] = _trainingType;
    }
    if (_freeTime != null && _freeTime!.isNotEmpty) p['free_time'] = _freeTime;
    if (_workSchedule.text.trim().isNotEmpty) {
      p['work_schedule'] = _workSchedule.text.trim();
    }
    if (_location.text.trim().isNotEmpty) p['location'] = _location.text.trim();
    final budget = double.tryParse(_maxBudget.text.trim());
    if (budget != null) p['max_budget'] = budget;
    if (_goals.text.trim().isNotEmpty) p['goals'] = _goals.text.trim();
    return p.isEmpty ? null : p;
  }

  Future<void> _send() async {
    final text = _input.text.trim();
    if (text.isEmpty || _sending) return;

    setState(() {
      _sending = true;
      _error = null;
      _messages.add(_ChatEntry(role: 'user', content: text));
      _input.clear();
    });
    _scrollToEnd();

    try {
      final history = _messages
          .where((m) => m.role == 'user' || m.role == 'assistant')
          .map((m) => {'role': m.role, 'content': m.content})
          .toList();

      final res = await _api.sendAiAssistantMessage(
        message: text,
        profile: _profilePayload(),
        history: history.length > 1 ? history.sublist(0, history.length - 1) : [],
      );

      final rec = res['recommendations'];
      Map<String, dynamic>? recommendations;
      if (rec is Map) recommendations = Map<String, dynamic>.from(rec);

      if (!mounted) return;
      setState(() {
        _messages.add(_ChatEntry(
          role: 'assistant',
          content: res['reply']?.toString() ?? '',
          recommendations: recommendations,
        ));
      });
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _sending = false);
      _scrollToEnd();
    }
  }

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(
          _scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  double _sheetHeight(BuildContext context) {
    final mq = MediaQuery.of(context);
    final top = mq.padding.top;
    final maxH = mq.size.height - top - 8;
    return (mq.size.height * 0.92).clamp(320.0, maxH);
  }

  void _scrollFieldIntoView(GlobalKey key) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final target = key.currentContext;
      if (target == null) return;
      Scrollable.ensureVisible(
        target,
        alignment: 0.25,
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOut,
      );
    });
  }

  Widget _buildHeader(BuildContext context, bool isDark) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const SizedBox(height: 8),
        Container(
          width: 40,
          height: 4,
          decoration: BoxDecoration(
            color: isDark ? Colors.white24 : Colors.black12,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 12, 8),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Fit Assistant',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                    Text(
                      'AI picks from real GymHub gyms & coaches',
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? Colors.white54 : Colors.black45,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close_rounded),
              ),
            ],
          ),
        ),
        InkWell(
          onTap: () => setState(() => _showProfile = !_showProfile),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
            child: Row(
              children: [
                Text(
                  'Your profile',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.brand,
                  ),
                ),
                const Spacer(),
                Icon(
                  _showProfile ? Icons.expand_less : Icons.expand_more,
                  size: 20,
                  color: AppTheme.brand,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildProfileForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: KeyedSubtree(
                key: _ageFieldKey,
                child: TextField(
                  controller: _ageCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Age',
                    isDense: true,
                  ),
                  onTap: () => _scrollFieldIntoView(_ageFieldKey),
                  onChanged: (v) {
                    _age = int.tryParse(v);
                    _persistProfileToSession();
                  },
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: KeyedSubtree(
                key: _weightFieldKey,
                child: TextField(
                  controller: _weightCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Weight (kg)',
                    isDense: true,
                  ),
                  onTap: () => _scrollFieldIntoView(_weightFieldKey),
                  onChanged: (v) {
                    _weight = double.tryParse(v);
                    _persistProfileToSession();
                  },
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        KeyedSubtree(
          key: _heightFieldKey,
          child: TextField(
            controller: _heightCtrl,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: 'Height (cm)',
              isDense: true,
            ),
            onTap: () => _scrollFieldIntoView(_heightFieldKey),
            onChanged: (v) {
              _heightCm = int.tryParse(v);
              _persistProfileToSession();
            },
          ),
        ),
        const SizedBox(height: 8),
        _dropdown(
          value: _gender ?? '',
          items: _genders,
          onChanged: (v) => setState(() {
            _gender = v;
            _persistProfileToSession();
          }),
        ),
        const SizedBox(height: 8),
        _dropdown(
          value: _trainingType ?? '',
          items: _trainingTypes,
          onChanged: (v) => setState(() {
            _trainingType = v;
            _persistProfileToSession();
          }),
        ),
        const SizedBox(height: 8),
        _dropdown(
          value: _freeTime ?? '',
          items: _freeTimes,
          onChanged: (v) => setState(() {
            _freeTime = v;
            _persistProfileToSession();
          }),
        ),
        const SizedBox(height: 8),
        KeyedSubtree(
          key: _workFieldKey,
          child: TextField(
            controller: _workSchedule,
            onTap: () => _scrollFieldIntoView(_workFieldKey),
            onChanged: (_) => _persistProfileToSession(),
            decoration: const InputDecoration(
              labelText: 'Work schedule',
              isDense: true,
            ),
          ),
        ),
        const SizedBox(height: 8),
        KeyedSubtree(
          key: _locationFieldKey,
          child: TextField(
            controller: _location,
            onTap: () => _scrollFieldIntoView(_locationFieldKey),
            onChanged: (_) => _persistProfileToSession(),
            decoration: const InputDecoration(
              labelText: 'City / area',
              isDense: true,
            ),
          ),
        ),
        const SizedBox(height: 8),
        KeyedSubtree(
          key: _budgetFieldKey,
          child: TextField(
            controller: _maxBudget,
            keyboardType: TextInputType.number,
            onTap: () => _scrollFieldIntoView(_budgetFieldKey),
            onChanged: (_) => _persistProfileToSession(),
            decoration: const InputDecoration(
              labelText: 'Max budget (\$)',
              isDense: true,
            ),
          ),
        ),
        const SizedBox(height: 8),
        KeyedSubtree(
          key: _goalsFieldKey,
          child: TextField(
            controller: _goals,
            maxLines: 2,
            onTap: () => _scrollFieldIntoView(_goalsFieldKey),
            onChanged: (_) => _persistProfileToSession(),
            decoration: const InputDecoration(
              labelText: 'Goals',
              isDense: true,
            ),
          ),
        ),
        const SizedBox(height: 12),
      ],
    );
  }

  Widget _buildInputBar() {
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(
              child: TextField(
                controller: _input,
                minLines: 1,
                maxLines: 4,
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => _send(),
                decoration: InputDecoration(
                  hintText: 'Ask about gyms, coaches, plans…',
                  filled: true,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            FilledButton(
              onPressed: _sending ? null : _send,
              style: FilledButton.styleFrom(
                minimumSize: const Size(48, 48),
                padding: EdgeInsets.zero,
              ),
              child: const Icon(Icons.send_rounded, size: 20),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final keyboardInset = MediaQuery.viewInsetsOf(context).bottom;

    return AnimatedPadding(
      padding: EdgeInsets.only(bottom: keyboardInset),
      duration: const Duration(milliseconds: 120),
      curve: Curves.easeOut,
      child: SizedBox(
        height: _sheetHeight(context),
        child: Column(
        children: [
          _buildHeader(context, isDark),
          Expanded(
            child: ListView(
              controller: _scroll,
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              children: [
                if (_showProfile) _buildProfileForm(),
                if (_showProfile)
                  const Divider(height: 24),
                ..._messages.map((m) => _bubble(m, isDark)),
                if (_sending)
                  const Padding(
                    padding: EdgeInsets.only(top: 8),
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: Text('Thinking…', style: TextStyle(fontSize: 12)),
                    ),
                  ),
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      _error!,
                      style: const TextStyle(color: Colors.red, fontSize: 12),
                    ),
                  ),
              ],
            ),
          ),
          _buildInputBar(),
        ],
      ),
      ),
    );
  }

  Widget _dropdown({
    required String value,
    required List<(String, String)> items,
    required ValueChanged<String?> onChanged,
  }) {
    return DropdownButtonFormField<String>(
      value: value.isEmpty ? '' : value,
      decoration: const InputDecoration(isDense: true),
      items: items
          .map(
            (e) => DropdownMenuItem(
              value: e.$1,
              child: Text(e.$2, style: const TextStyle(fontSize: 14)),
            ),
          )
          .toList(),
      onChanged: onChanged,
    );
  }

  Widget _bubble(_ChatEntry m, bool isDark) {
    final isUser = m.role == 'user';
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.82,
        ),
        decoration: BoxDecoration(
          color: isUser
              ? AppTheme.brand
              : (isDark ? const Color(0xFF2A2A2A) : const Color(0xFFF0F0EF)),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              m.content,
              style: TextStyle(
                color: isUser ? Colors.white : (isDark ? Colors.white : Colors.black87),
                fontSize: 14,
                height: 1.4,
              ),
            ),
            if (m.recommendations != null) ...[
              const SizedBox(height: 8),
              _recBlock(m.recommendations!, isDark, isUser),
            ],
          ],
        ),
      ),
    );
  }

  Widget _recBlock(Map<String, dynamic> rec, bool isDark, bool onBrandBg) {
    final subColor = onBrandBg ? Colors.white70 : (isDark ? Colors.white54 : Colors.black54);
    final gym = rec['gym'] is Map ? Map<String, dynamic>.from(rec['gym'] as Map) : null;
    final plan = rec['plan'] is Map ? Map<String, dynamic>.from(rec['plan'] as Map) : null;
    final coach = rec['coach'] is Map ? Map<String, dynamic>.from(rec['coach'] as Map) : null;
    final trainingPlan = rec['training_plan']?.toString();

    int? gymIdFromPath(String? path) {
      if (path == null) return null;
      final m = RegExp(r'/gyms/(\d+)').firstMatch(path);
      return m != null ? int.tryParse(m.group(1)!) : null;
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (gym != null && gym['name'] != null)
          TextButton(
            style: TextButton.styleFrom(
              padding: EdgeInsets.zero,
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              foregroundColor: onBrandBg ? Colors.white : AppTheme.brand,
            ),
            onPressed: () {
              final id = gymIdFromPath(gym['path']?.toString());
              if (id == null) return;
              Navigator.pop(context);
              Navigator.pushNamed(context, AppRouter.gymDetails, arguments: id);
            },
            child: Text(
              'View gym: ${gym['name']}',
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12),
            ),
          ),
        if (plan != null && plan['name'] != null)
          Text('Plan: ${plan['name']}', style: TextStyle(fontSize: 11, color: subColor)),
        if (coach != null && coach['name'] != null)
          Text(
            'Coach: ${coach['name']}${coach['specialization'] != null ? ' (${coach['specialization']})' : ''}',
            style: TextStyle(fontSize: 11, color: subColor),
          ),
        if (trainingPlan != null && trainingPlan.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
              trainingPlan,
              style: TextStyle(fontSize: 11, color: subColor, height: 1.35),
            ),
          ),
      ],
    );
  }
}

class _ChatEntry {
  _ChatEntry({
    required this.role,
    required this.content,
    this.recommendations,
  });

  final String role;
  final String content;
  final Map<String, dynamic>? recommendations;
}
