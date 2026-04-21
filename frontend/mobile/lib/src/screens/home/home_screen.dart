import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/auth_provider.dart';
import '../../routes/app_router.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/glow_background.dart';
import '../../widgets/gym_card.dart';
import '../../widgets/section_header.dart';
import '../../widgets/stat_card.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, this.onOpenTab});

  /// Callback used by the shell so "View all" / quick actions can switch tabs.
  final void Function(int index)? onOpenTab;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _api = ApiService.instance;

  bool _loading = true;
  int _gymsCount = 0;
  int _subsCount = 0;
  List<Map<String, dynamic>> _featured = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (!mounted) return;
    final isAuth = context.read<AuthProvider>().isAuthenticated;
    setState(() => _loading = true);
    try {
      final gymsRes = await _api.getGymsPaged(page: 1, limit: 6);
      final List data = gymsRes['data'] as List? ?? const [];
      _featured = data
          .whereType<Map>()
          .map((m) => Map<String, dynamic>.from(m))
          .toList(growable: false);
      _gymsCount = gymsRes['total'] as int? ?? _featured.length;

      if (isAuth) {
        try {
          final subs = await _api.getMySubscriptions();
          _subsCount = subs.length;
        } catch (_) {
          _subsCount = 0;
        }
      }
    } catch (_) {
      // Soft-fail: we still render the shell with zeros.
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final firstName = auth.user?['first_name']?.toString() ?? 'there';

    return RefreshIndicator(
      color: AppTheme.brand,
      onRefresh: _load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: EdgeInsets.zero,
        children: [
          // ─── Hero ───
          GlowBackground(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 28, 20, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: AppTheme.brand.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppTheme.brand.withValues(alpha: 0.25)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 6,
                          height: 6,
                          decoration: const BoxDecoration(
                            color: AppTheme.brand,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 6),
                        const Text(
                          'YOUR FITNESS JOURNEY STARTS HERE',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 1.4,
                            color: AppTheme.brand,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                  _heroTitle(auth.isAuthenticated, firstName),
                  const SizedBox(height: 10),
                  Text(
                    'Discover top-rated gyms, subscribe to flexible plans, and book personalized sessions with expert coaches — all in one place.',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: isDark ? Colors.white70 : Colors.black54,
                          height: 1.5,
                        ),
                  ),
                  const SizedBox(height: 18),
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () => widget.onOpenTab?.call(1),
                          icon: const Icon(Icons.fitness_center_rounded, size: 18),
                          label: const Text('Browse Gyms'),
                        ),
                      ),
                      if (auth.isAuthenticated) ...[
                        const SizedBox(width: 10),
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () => widget.onOpenTab?.call(2),
                            icon: const Icon(Icons.event_outlined, size: 18),
                            label: const Text('Sessions'),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 24),
                  _StatsGrid(
                    loading: _loading,
                    isAuthenticated: auth.isAuthenticated,
                    gymsCount: _gymsCount,
                    subsCount: _subsCount,
                  ),
                ],
              ),
            ),
          ),

          // ─── Featured gyms ───
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
            child: SectionHeader(
              eyebrow: 'Explore',
              title: 'Featured Gyms',
              trailing: TextButton(
                onPressed: () => widget.onOpenTab?.call(1),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('View all'),
                    SizedBox(width: 4),
                    Icon(Icons.arrow_forward_rounded, size: 16),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 14),
          if (_loading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 32),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_featured.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
              child: Text(
                'No gyms available yet. Check back soon.',
                style: TextStyle(color: isDark ? Colors.white60 : Colors.black54),
              ),
            )
          else
            SizedBox(
              height: 290,
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                scrollDirection: Axis.horizontal,
                itemCount: _featured.length,
                separatorBuilder: (_, _) => const SizedBox(width: 14),
                itemBuilder: (context, i) {
                  final gym = _featured[i];
                  return SizedBox(
                    width: 260,
                    child: GymCard(
                      gym: gym,
                      onTap: () => Navigator.pushNamed(
                        context,
                        AppRouter.gymDetails,
                        arguments: gym['id'] is int
                            ? gym['id']
                            : int.tryParse('${gym['id']}'),
                      ),
                    ),
                  );
                },
              ),
            ),

          // ─── How it works ───
          const SizedBox(height: 32),
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 0, 20, 0),
            child: SectionHeader(
              eyebrow: 'Simple & Fast',
              title: 'How GymHub Works',
            ),
          ),
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Column(
              children: const [
                _StepCard(
                  number: '01',
                  title: 'Find Your Gym',
                  description:
                      'Browse partner gyms, compare prices and amenities, and pick the perfect spot near you.',
                  icon: Icons.search_rounded,
                ),
                SizedBox(height: 12),
                _StepCard(
                  number: '02',
                  title: 'Subscribe & Pay',
                  description:
                      'Choose a plan, pay with card or cash — your membership and payments are tracked automatically.',
                  icon: Icons.credit_card_rounded,
                ),
                SizedBox(height: 12),
                _StepCard(
                  number: '03',
                  title: 'Train & Track',
                  description:
                      'Book sessions with certified coaches, check your weekly calendar, and stay on top of your goals.',
                  icon: Icons.calendar_month_rounded,
                ),
              ],
            ),
          ),

          // ─── CTA banner ───
          const SizedBox(height: 32),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: _CtaCard(
              onBrowse: () => widget.onOpenTab?.call(1),
            ),
          ),
          const SizedBox(height: 28),
        ],
      ),
    );
  }

  Widget _heroTitle(bool isAuth, String firstName) {
    final base = Theme.of(context).textTheme.displaySmall?.copyWith(
              fontWeight: FontWeight.w900,
              height: 1.1,
            ) ??
        const TextStyle(fontSize: 34, fontWeight: FontWeight.w900);

    final highlight = base.copyWith(
      foreground: Paint()
        ..shader = AppTheme.brandGradient.createShader(
          const Rect.fromLTWH(0, 0, 200, 50),
        ),
    );

    if (isAuth) {
      return Text.rich(
        TextSpan(
          children: [
            const TextSpan(text: 'Welcome back,\n'),
            TextSpan(text: firstName, style: highlight),
          ],
        ),
        style: base,
      );
    }
    return Text.rich(
      TextSpan(
        children: [
          const TextSpan(text: 'Find, Subscribe &\n'),
          TextSpan(text: 'Train', style: highlight),
        ],
      ),
      style: base,
    );
  }
}

class _StatsGrid extends StatelessWidget {
  const _StatsGrid({
    required this.loading,
    required this.isAuthenticated,
    required this.gymsCount,
    required this.subsCount,
  });

  final bool loading;
  final bool isAuthenticated;
  final int gymsCount;
  final int subsCount;

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);
    final width = media.size.width;
    final scale = media.textScaler.scale(1);

    // 2 columns always — pick a row height that comfortably fits the card
    // content at any reasonable text scale. Clamp to safe bounds.
    final rowHeight = (124 * scale).clamp(118.0, 170.0);

    final cards = [
      StatCard(
        label: 'Active gyms',
        value: loading ? '…' : '$gymsCount',
        icon: Icons.apartment_rounded,
        accent: AppTheme.brand,
      ),
      StatCard(
        label: 'Your subscriptions',
        value: isAuthenticated ? (loading ? '…' : '$subsCount') : '—',
        icon: Icons.verified_rounded,
        accent: const Color(0xFF10B981),
      ),
      const StatCard(
        label: 'Expert coaches',
        value: '50+',
        icon: Icons.groups_rounded,
        accent: Color(0xFF8B5CF6),
      ),
      const StatCard(
        label: 'Average rating',
        value: '4.8',
        icon: Icons.star_rounded,
        accent: AppTheme.amber,
      ),
    ];

    // For very narrow screens, fall back to a single column.
    if (width < 340) {
      return Column(
        children: [
          for (int i = 0; i < cards.length; i++) ...[
            SizedBox(height: rowHeight, child: cards[i]),
            if (i != cards.length - 1) const SizedBox(height: 12),
          ],
        ],
      );
    }

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: cards.length,
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        mainAxisExtent: rowHeight,
      ),
      itemBuilder: (_, i) => cards[i],
    );
  }
}

class _StepCard extends StatelessWidget {
  const _StepCard({
    required this.number,
    required this.title,
    required this.description,
    required this.icon,
  });

  final String number;
  final String title;
  final String description;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF171717) : Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: isDark ? const Color(0xFF262626) : const Color(0xFFEDEDED),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: AppTheme.brand, size: 22),
              const SizedBox(height: 10),
              Text(
                title,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const SizedBox(height: 4),
              Text(
                description,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: isDark ? Colors.white60 : Colors.black54,
                      height: 1.45,
                    ),
              ),
            ],
          ),
        ),
        Positioned(
          left: 20,
          top: -12,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
            decoration: BoxDecoration(
              gradient: AppTheme.brandGradient,
              borderRadius: BorderRadius.circular(8),
              boxShadow: [
                BoxShadow(
                  color: AppTheme.brand.withValues(alpha: 0.45),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Text(
              number,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 11,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.5,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _CtaCard extends StatelessWidget {
  const _CtaCard({required this.onBrowse});

  final VoidCallback onBrowse;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(24),
      child: Stack(
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(24, 28, 24, 28),
            decoration: const BoxDecoration(gradient: AppTheme.darkGradient),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Ready to start your\nfitness journey?',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                    height: 1.15,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  'Join thousands of members who train smarter with GymHub. Your perfect gym is one tap away.',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.75),
                    fontSize: 13,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 20),
                Align(
                  alignment: Alignment.centerLeft,
                  child: ElevatedButton.icon(
                    onPressed: onBrowse,
                    icon: const Icon(Icons.rocket_launch_rounded, size: 18),
                    label: const Text('Get started'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: const Color(0xFF1F1F1F),
                      minimumSize: const Size(160, 48),
                    ),
                  ),
                ),
              ],
            ),
          ),
          Positioned(
            top: -30,
            right: -20,
            child: Container(
              width: 160,
              height: 160,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    AppTheme.brand.withValues(alpha: 0.45),
                    AppTheme.brand.withValues(alpha: 0),
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            bottom: -40,
            right: 40,
            child: Container(
              width: 180,
              height: 180,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    AppTheme.amber.withValues(alpha: 0.35),
                    AppTheme.amber.withValues(alpha: 0),
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
