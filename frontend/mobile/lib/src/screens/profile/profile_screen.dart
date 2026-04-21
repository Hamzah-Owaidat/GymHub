import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../providers/auth_provider.dart';
import '../../routes/app_router.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/glow_background.dart';
import '../../widgets/section_header.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _api = ApiService.instance;

  bool _loading = true;
  bool _saving = false;
  List<Map<String, dynamic>> _cards = [];

  final _label = TextEditingController();
  final _holder = TextEditingController();
  final _number = TextEditingController();
  final _expiry = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadCards();
  }

  @override
  void dispose() {
    _label.dispose();
    _holder.dispose();
    _number.dispose();
    _expiry.dispose();
    super.dispose();
  }

  Future<void> _loadCards() async {
    if (!mounted) return;
    setState(() => _loading = true);
    try {
      final data = await _api.getCards();
      _cards = data
          .whereType<Map>()
          .map((m) => Map<String, dynamic>.from(m))
          .toList(growable: false);
    } catch (e) {
      if (mounted) _snack(e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _addCard() async {
    final holder = _holder.text.trim();
    final number = _number.text.replaceAll(' ', '');
    final expiry = _expiry.text.trim();

    if (holder.isEmpty) {
      _snack('Card holder is required');
      return;
    }
    if (number.length < 12) {
      _snack('A valid card number is required');
      return;
    }
    if (!RegExp(r'^\d{2}\/\d{2}$').hasMatch(expiry)) {
      _snack('Card expiry must be in MM/YY format');
      return;
    }

    setState(() => _saving = true);
    try {
      await _api.createCard(
        cardLabel: _label.text.trim(),
        cardHolder: holder,
        cardNumber: number,
        cardExpiry: expiry,
      );
      _label.clear();
      _holder.clear();
      _number.clear();
      _expiry.clear();
      await _loadCards();
      if (mounted) _snack('Card saved');
    } catch (e) {
      if (mounted) _snack(e.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _snack(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg)),
    );
  }

  Future<void> _openAddCardSheet() async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 16,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
          child: StatefulBuilder(
            builder: (ctx, setLocal) => Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 36,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(
                    color: Colors.grey.withValues(alpha: 0.35),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                Text(
                  'Add payment card',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                ),
                const SizedBox(height: 4),
                Text(
                  'We store only the last 4 digits — never full card numbers.',
                  style: TextStyle(
                    color: Theme.of(ctx).brightness == Brightness.dark
                        ? Colors.white60
                        : Colors.black54,
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: 18),
                TextField(
                  controller: _label,
                  decoration: const InputDecoration(labelText: 'Label (optional)'),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _holder,
                  decoration: const InputDecoration(labelText: 'Card holder'),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _number,
                  keyboardType: TextInputType.number,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(19),
                  ],
                  decoration: const InputDecoration(labelText: 'Card number'),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _expiry,
                  keyboardType: TextInputType.datetime,
                  inputFormatters: [
                    LengthLimitingTextInputFormatter(5),
                    _ExpiryFormatter(),
                  ],
                  decoration: const InputDecoration(labelText: 'Expiry (MM/YY)'),
                ),
                const SizedBox(height: 18),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _saving
                        ? null
                        : () async {
                            await _addCard();
                            if (ctx.mounted) Navigator.pop(ctx);
                          },
                    child: Text(_saving ? 'Saving…' : 'Save card'),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final user = auth.user ?? const {};
    final firstName = user['first_name']?.toString() ?? '';
    final lastName = user['last_name']?.toString() ?? '';
    final email = user['email']?.toString() ?? '';
    final role = user['role']?.toString() ?? '';
    final initials = _initials(firstName, lastName, email);

    return RefreshIndicator(
      color: AppTheme.brand,
      onRefresh: _loadCards,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: EdgeInsets.zero,
        children: [
          // ─── Header with avatar + glow ───
          GlowBackground(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 28, 20, 24),
              child: Column(
                children: [
                  Container(
                    width: 96,
                    height: 96,
                    decoration: BoxDecoration(
                      gradient: AppTheme.brandGradient,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: AppTheme.brand.withValues(alpha: 0.45),
                          blurRadius: 28,
                          offset: const Offset(0, 10),
                        ),
                      ],
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      initials,
                      style: const TextStyle(
                        fontSize: 34,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Text(
                    [firstName, lastName].where((s) => s.isNotEmpty).join(' ').trim().isEmpty
                        ? 'Your account'
                        : '$firstName $lastName'.trim(),
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                  if (email.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      email,
                      style: TextStyle(
                        color: isDark ? Colors.white60 : Colors.black54,
                      ),
                    ),
                  ],
                  if (role.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                      decoration: BoxDecoration(
                        color: AppTheme.brand.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppTheme.brand.withValues(alpha: 0.3)),
                      ),
                      child: Text(
                        role.toUpperCase(),
                        style: const TextStyle(
                          fontSize: 11,
                          letterSpacing: 1.3,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.brand,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),

          // ─── Quick actions ───
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 0),
            child: Row(
              children: [
                Expanded(
                  child: _ActionTile(
                    icon: Icons.event_outlined,
                    label: 'Sessions',
                    onTap: () => Navigator.pushNamed(context, AppRouter.app),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _ActionTile(
                    icon: Icons.chat_bubble_outline_rounded,
                    label: 'Chat',
                    onTap: () => Navigator.pushNamed(context, AppRouter.app),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _ActionTile(
                    icon: Icons.logout_rounded,
                    label: 'Logout',
                    accent: const Color(0xFFEF4444),
                    onTap: () async {
                      await context.read<AuthProvider>().logout();
                      if (!context.mounted) return;
                      Navigator.pushNamedAndRemoveUntil(
                          context, AppRouter.signIn, (_) => false);
                    },
                  ),
                ),
              ],
            ),
          ),

          // ─── Saved cards ───
          const SizedBox(height: 28),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: SectionHeader(
              eyebrow: 'Billing',
              title: 'Saved Cards',
              trailing: TextButton.icon(
                onPressed: _cards.length >= 2 ? null : _openAddCardSheet,
                icon: const Icon(Icons.add_rounded, size: 16),
                label: const Text('Add'),
              ),
            ),
          ),
          const SizedBox(height: 12),
          if (_loading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_cards.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: _EmptyCardTile(onAdd: _openAddCardSheet, isDark: isDark),
            )
          else ...[
            for (final c in _cards)
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                child: _CardTile(
                  card: c,
                  onMakeDefault: () async {
                    try {
                      await _api.setDefaultCard(c['id'] as int);
                      await _loadCards();
                    } catch (e) {
                      if (mounted) _snack(e.toString());
                    }
                  },
                  onDelete: () async {
                    try {
                      await _api.deleteCard(c['id'] as int);
                      await _loadCards();
                    } catch (e) {
                      if (mounted) _snack(e.toString());
                    }
                  },
                ),
              ),
          ],
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  String _initials(String first, String last, String email) {
    if (first.isNotEmpty || last.isNotEmpty) {
      final a = first.isNotEmpty ? first[0] : '';
      final b = last.isNotEmpty ? last[0] : '';
      return (a + b).toUpperCase();
    }
    if (email.isNotEmpty) return email[0].toUpperCase();
    return 'U';
  }
}

class _ActionTile extends StatelessWidget {
  const _ActionTile({
    required this.icon,
    required this.label,
    required this.onTap,
    this.accent,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color? accent;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final a = accent ?? AppTheme.brand;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF171717) : Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: isDark ? const Color(0xFF262626) : const Color(0xFFEDEDED),
          ),
        ),
        child: Column(
          children: [
            Icon(icon, color: a, size: 22),
            const SizedBox(height: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: isDark ? Colors.white : Colors.black87,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CardTile extends StatelessWidget {
  const _CardTile({
    required this.card,
    required this.onMakeDefault,
    required this.onDelete,
  });

  final Map<String, dynamic> card;
  final VoidCallback onMakeDefault;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final label = card['card_label']?.toString().trim() ?? '';
    final last4 = card['card_last4']?.toString() ?? '••••';
    final expiry = card['card_expiry']?.toString() ?? '';
    final holder = card['card_holder']?.toString() ?? '';
    final isDefault = card['is_default'] == true || card['is_default'] == 1;

    return ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: Stack(
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(18, 18, 12, 14),
            decoration: const BoxDecoration(gradient: AppTheme.darkGradient),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        label.isEmpty ? 'Card' : label,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    if (isDefault)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppTheme.brand,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Text(
                          'DEFAULT',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.8,
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 20),
                Text(
                  '•••• •••• •••• $last4',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    letterSpacing: 3,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    if (holder.isNotEmpty) ...[
                      Text(
                        holder.toUpperCase(),
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.75),
                          fontSize: 11,
                          letterSpacing: 1.1,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const Spacer(),
                    ] else
                      const Spacer(),
                    if (expiry.isNotEmpty)
                      Text(
                        expiry,
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.85),
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    const SizedBox(width: 4),
                    if (!isDefault)
                      IconButton(
                        tooltip: 'Make default',
                        onPressed: onMakeDefault,
                        icon: const Icon(Icons.star_border_rounded, color: Colors.white70),
                      ),
                    IconButton(
                      tooltip: 'Delete',
                      onPressed: onDelete,
                      icon: const Icon(Icons.delete_outline_rounded, color: Colors.white70),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Positioned(
            top: -20,
            right: -20,
            child: Container(
              width: 140,
              height: 140,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    AppTheme.brand.withValues(alpha: 0.35),
                    AppTheme.brand.withValues(alpha: 0),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyCardTile extends StatelessWidget {
  const _EmptyCardTile({required this.onAdd, required this.isDark});

  final VoidCallback onAdd;
  final bool isDark;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onAdd,
      borderRadius: BorderRadius.circular(18),
      child: Container(
        padding: const EdgeInsets.all(22),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF171717) : Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: isDark ? const Color(0xFF262626) : const Color(0xFFEDEDED),
            style: BorderStyle.solid,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: AppTheme.brand.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.credit_card_rounded, color: AppTheme.brand),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Add your first card',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Save up to 2 cards for faster checkout.',
                    style: TextStyle(
                      color: isDark ? Colors.white60 : Colors.black54,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded),
          ],
        ),
      ),
    );
  }
}

/// Auto-inserts `/` after two digits while typing the expiry date.
class _ExpiryFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
      TextEditingValue oldValue, TextEditingValue newValue) {
    final digits = newValue.text.replaceAll(RegExp(r'[^0-9]'), '');
    final buf = StringBuffer();
    for (int i = 0; i < digits.length && i < 4; i++) {
      if (i == 2) buf.write('/');
      buf.write(digits[i]);
    }
    final out = buf.toString();
    return TextEditingValue(
      text: out,
      selection: TextSelection.collapsed(offset: out.length),
    );
  }
}
