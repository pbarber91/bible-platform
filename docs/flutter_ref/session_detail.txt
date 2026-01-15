import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../db/app_db.dart';
import '../widgets/hero_header.dart';
import '../ui/ui_card.dart';
import '../widgets/empty_state.dart';
import '../widgets/fade_slide_in.dart';
import 'journal_screen.dart';
import 'session_editor.dart';

class SessionDetail extends StatefulWidget {
  final String sessionId;

  const SessionDetail({
    super.key,
    required this.sessionId,
  });

  @override
  State<SessionDetail> createState() => _SessionDetailState();
}

class _SessionDetailState extends State<SessionDetail> {
  late Future<Map<String, Object?>?> _future;

  static const String _genreMarker = '\n\n===GENRE===\n';
  static const String _passageMarker = '\n\n===PASSAGE_TEXT===\n';

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  void _refresh() {
    _future = AppDb.instance.getSession(widget.sessionId);
  }

  Future<void> _reload() async {
    setState(() => _refresh());
  }

  String _getStr(Map<String, Object?> row, List<String> keys, {String fallback = ''}) {
    for (final k in keys) {
      final v = row[k];
      if (v is String && v.trim().isNotEmpty) return v;
    }
    return fallback;
  }

  ({String visibleNotes, String genre, String passageText}) _extractNotesGenrePassage(String raw) {
    String visible = raw;
    String genre = '';
    String passage = '';

    final gIdx = raw.indexOf(_genreMarker);
    final pIdx = raw.indexOf(_passageMarker);

    final markers = <int>[];
    if (gIdx >= 0) markers.add(gIdx);
    if (pIdx >= 0) markers.add(pIdx);
    markers.sort();

    if (markers.isNotEmpty) {
      visible = raw.substring(0, markers.first).trimRight();
    } else {
      visible = raw.trimRight();
    }

    if (gIdx >= 0) {
      final after = raw.substring(gIdx + _genreMarker.length);
      final nextPassageIdx = after.indexOf(_passageMarker);
      genre = (nextPassageIdx >= 0 ? after.substring(0, nextPassageIdx) : after).trim();
    }

    if (pIdx >= 0) {
      passage = raw.substring(pIdx + _passageMarker.length).trim();
    }

    return (visibleNotes: visible, genre: genre.isEmpty ? 'Unknown' : genre, passageText: passage);
  }

  // ---------------------------------------------------------------------------
  // Genre lens bullets (3 reminders)
  // ---------------------------------------------------------------------------

  List<String> _genreLensBullets(String genre) {
    switch (genre) {
      case 'Narrative':
        return const [
          'Follow the story movement: setup → tension → resolution.',
          'Watch for repeated phrases or actions.',
          'Ask what changes from beginning to end.',
        ];
      case 'Gospel':
        return const [
          'Notice what Jesus says/does and why.',
          'Track how people respond.',
          'Look for repeated themes (faith, kingdom, light).',
        ];
      case 'Poetry/Wisdom':
        return const [
          'Look for imagery and parallel lines.',
          'Watch for contrasts (wise/fool, righteous/wicked).',
          'Pay attention to tone and emotion.',
        ];
      case 'Law':
        return const [
          'Identify who the command applies to.',
          'Look for conditions (“if… then…”).',
          'Notice repeated covenant language.',
        ];
      case 'Epistle':
        return const [
          'Track the logical flow of the argument.',
          'Notice logic words (“because/therefore”).',
          'Commands usually follow gospel truths.',
        ];
      case 'Prophecy':
        return const [
          'Look for calls to repentance and hope.',
          'Notice repeated images.',
          'Time horizons may be layered.',
        ];
      case 'Apocalyptic':
        return const [
          'Symbolism is the primary language.',
          'Look for repeated numbers and images.',
          'Focus on hope and endurance.',
        ];
      default:
        return const [
          'Genre shapes how a passage should be read.',
          'Observe before interpreting.',
          'Stay anchored to the text.',
        ];
    }
  }

  Widget _bullet(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('•  ', style: TextStyle(fontWeight: FontWeight.w900)),
          Expanded(child: Text(text)),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Section builder
  // ---------------------------------------------------------------------------

  Widget _section({
    required IconData icon,
    required String title,
    required String body,
  }) {
    final text = body.trim();
    if (text.isEmpty) return const SizedBox.shrink();

    return AppCard(
      tier: AppCardTier.low,
      padding: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    title,
                    style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(text),
          ],
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Context snapshot card
  // ---------------------------------------------------------------------------

  Widget _contextSnapshotCard({
    required String genre,
    required String audience,
    required String meaning,
  }) {
    final a = audience.trim();
    final m = meaning.trim();
    final empty = a.isEmpty && m.isEmpty;

    return AppCard(
      tier: AppCardTier.low,
      padding: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.public_outlined),
                const SizedBox(width: 10),
                const Expanded(
                  child: Text(
                    'Context Snapshot',
                    style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
                  ),
                  child: Text(
                    genre == 'Unknown' ? 'General' : genre,
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            if (empty)
              Text(
                'No context added yet. Tap Edit and fill “Original audience” + “What did it mean to them?”',
                style: Theme.of(context).textTheme.bodyMedium,
              )
            else ...[
              if (a.isNotEmpty) ...[
                Text(
                  'Original audience',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        fontWeight: FontWeight.w900,
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                ),
                const SizedBox(height: 6),
                Text(a),
              ],
              if (a.isNotEmpty && m.isNotEmpty) const SizedBox(height: 12),
              if (m.isNotEmpty) ...[
                Text(
                  'Meaning to them',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        fontWeight: FontWeight.w900,
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                ),
                const SizedBox(height: 6),
                Text(m),
              ],
            ],
          ],
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Commitment card (spacing-safe highlighting)
  // ---------------------------------------------------------------------------

  List<String> _applicationTips(String app) {
    final tips = <String>[];
    final lower = app.toLowerCase().trim();
    if (lower.isEmpty) return tips;

    const anchors = ['because', 'therefore', 'so that', 'since', 'in light of', 'as a result'];
    const firstPerson = ['i will', 'i am going to', 'today i', 'this week i', 'i plan to'];
    const timeWords = ['today', 'tonight', 'this week', 'this month', 'tomorrow', 'by ', 'before ', 'on '];

    if (!anchors.any((a) => lower.contains(a))) {
      tips.add('Add a “why” link (because/therefore/so that) to connect it to the text.');
    }
    if (!firstPerson.any((p) => lower.contains(p))) {
      tips.add('Rewrite as a first-person commitment (“This week I will…”).');
    }
    if (!timeWords.any((w) => lower.contains(w))) {
      tips.add('Add a timeframe (today/this week/by Friday) so it’s actionable.');
    }

    const vague = [
      'be better',
      'do better',
      'try harder',
      'be kind',
      'be loving',
      'love people',
      'have faith',
      'trust god',
      'pray more',
      'read more',
      'go to church',
    ];
    if (vague.any((p) => lower.contains(p))) {
      tips.add('Make it specific and measurable (what exactly will you do, and when?).');
    }

    return tips.take(3).toList();
  }

  InlineSpan _styledChunk(String chunk, TextStyle base) {
    final scheme = Theme.of(context).colorScheme;

    const d0 = Duration(milliseconds: 0);
    const d1 = Duration(milliseconds: 80);
    const d2 = Duration(milliseconds: 140);
    const d3 = Duration(milliseconds: 200);
    const d4 = Duration(milliseconds: 260);
    final t = chunk.toLowerCase();

    const anchorWords = ['because', 'therefore', 'so that', 'since', 'in light of', 'as a result'];
    const timeWords = ['today', 'tonight', 'tomorrow', 'this week', 'this month', 'by ', 'before ', 'on '];
    const commitWords = ['i will', 'i am going to', 'i plan to', 'this week i', 'today i'];

    final isCommit = commitWords.any((w) => t.contains(w));
    final isAnchor = anchorWords.any((w) => t.contains(w));
    final isTime = timeWords.any((w) => t.contains(w));

    var style = base;
    if (isCommit) {
      style = base.copyWith(fontWeight: FontWeight.w900);
    } else if (isAnchor) {
      style = base.copyWith(fontWeight: FontWeight.w800, color: scheme.primary);
    } else if (isTime) {
      style = base.copyWith(fontWeight: FontWeight.w800, color: scheme.tertiary);
    }

    return TextSpan(text: chunk, style: style);
  }

  TextSpan _highlightSpanPreserveWhitespace(String text) {
    final base = Theme.of(context).textTheme.bodyLarge ?? const TextStyle(fontSize: 16);

    final lower = text.toLowerCase();
    const keywords = [
      'because',
      'therefore',
      'so that',
      'since',
      'in light of',
      'as a result',
      'today',
      'tonight',
      'tomorrow',
      'this week',
      'this month',
      'by ',
      'before ',
      'on ',
      'i will',
      'i am going to',
      'i plan to',
      'this week i',
      'today i',
    ];
    final hasAny = keywords.any((k) => lower.contains(k));
    if (!hasAny) return TextSpan(text: text, style: base);

    // Apostrophes-safe token matcher
    final re = RegExp(r"([A-Za-z0-9]+(?:'[A-Za-z0-9]+)*)");

    final spans = <InlineSpan>[];
    int idx = 0;

    for (final m in re.allMatches(text)) {
      if (m.start > idx) {
        spans.add(TextSpan(text: text.substring(idx, m.start), style: base));
      }
      final word = text.substring(m.start, m.end);
      spans.add(_styledChunk(word, base));
      idx = m.end;
    }

    if (idx < text.length) {
      spans.add(TextSpan(text: text.substring(idx), style: base));
    }

    return TextSpan(children: spans);
  }

  Widget _applicationCommitmentCard({required String app}) {
    final text = app.trim();
    if (text.isEmpty) return const SizedBox.shrink();

    final tips = _applicationTips(text);
    final scheme = Theme.of(context).colorScheme;

    return AppCard(
      tier: AppCardTier.low,
      padding: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.flag_outlined),
                const SizedBox(width: 10),
                const Expanded(
                  child: Text(
                    'Commitment',
                    style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(999),
                    color: scheme.primaryContainer.withOpacity(0.55),
                    border: Border.all(color: scheme.outlineVariant),
                  ),
                  child: const Text('Application', style: TextStyle(fontWeight: FontWeight.w900)),
                ),
              ],
            ),
            const SizedBox(height: 12),
            RichText(text: _highlightSpanPreserveWhitespace(text)),
            if (tips.isNotEmpty) ...[
              const SizedBox(height: 12),
              _MicroDivider(accent: scheme.primary, compact: true),
              const SizedBox(height: 12),
              Text(
                'Improve it',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 8),
              ...tips.map(
                (t) => Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Icons.lightbulb_outline, size: 18, color: scheme.primary),
                      const SizedBox(width: 8),
                      Expanded(child: Text(t)),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  Future<void> _edit(Map<String, Object?> row) async {
    final planId = _getStr(row, const ['plan_id', 'planId']);
    final ok = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) => SessionEditor(
          planId: planId,
          sessionId: widget.sessionId,
        ),
      ),
    );
    if (ok == true && mounted) _reload();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isDark = scheme.brightness == Brightness.dark;

    // Subtle background depth (keeps content readable; no logic changes).
    final blobA = scheme.primary.withOpacity(isDark ? 0.18 : 0.10);
    final blobB = scheme.tertiary.withOpacity(isDark ? 0.14 : 0.08);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Session'),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: _reload,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: Stack(
        children: [
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: scheme.surface,
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    scheme.surface,
                    scheme.surfaceVariant.withOpacity(isDark ? 0.10 : 0.16),
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            top: isDark ? -140 : -110,
            right: isDark ? -140 : -110,
            child: IgnorePointer(
              ignoring: true,
              child: Container(
                width: isDark ? 420 : 320,
                height: isDark ? 420 : 320,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [blobA, blobA.withOpacity(0.0)],
                  ),
                ),
              ),
            ),
          ),
          Positioned(
            bottom: isDark ? -190 : -140,
            left: isDark ? -170 : -130,
            child: IgnorePointer(
              ignoring: true,
              child: Container(
                width: isDark ? 520 : 400,
                height: isDark ? 520 : 400,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [blobB, blobB.withOpacity(0.0)],
                  ),
                ),
              ),
            ),
          ),

          FutureBuilder<Map<String, Object?>?>(
            future: _future,
            builder: (context, snap) {
              if (snap.connectionState != ConnectionState.done) {
                return const Center(child: CircularProgressIndicator());
              }

              if (snap.hasError) {
                return Padding(
                  padding: const EdgeInsets.all(16),
                  child: EmptyState(
                    icon: Icons.error_outline,
                    title: 'Couldn’t load this session',
                    message: 'Please pull to refresh or try again.',
                    buttonText: 'Try again',
                    onPressed: _reload,
                  ),
                );
              }

              final row = snap.data;
              if (row == null) {
                return Padding(
                  padding: const EdgeInsets.all(16),
                  child: EmptyState(
                    icon: Icons.search_off_outlined,
                    title: 'Session not found',
                    message: 'This session may have been deleted or is unavailable.',
                    buttonText: 'Go back',
                    onPressed: () => Navigator.pop(context),
                  ),
                );
              }

              final dateMs =
                  (row['session_date'] as int?) ?? DateTime.now().millisecondsSinceEpoch;
              final when = DateTime.fromMillisecondsSinceEpoch(dateMs);
              final dateStr = DateFormat.yMMMd().format(when);

              final passageRef = _getStr(row, const ['passage']);

              final rawNotes = _getStr(row, const ['notes']);
              final parts = _extractNotesGenrePassage(rawNotes);
              final genre = parts.genre;

              final obs = _getStr(row, const ['observations', 'observation', 'obs']);
              final aud = _getStr(
                row,
                const ['original_audience', 'originalAudience', 'audience', 'aud'],
              );
              final mean = _getStr(
                row,
                const ['original_meaning', 'originalMeaning', 'meaning', 'mean'],
              );
              final sim = _getStr(
                row,
                const ['similar_context', 'similarContext', 'similarities', 'sim'],
              );
              final diff = _getStr(
                row,
                const ['different_context', 'differentContext', 'differences', 'diff'],
              );
              final app = _getStr(row, const ['application', 'apply', 'app']);

              final lens = _genreLensBullets(genre);

              return RefreshIndicator(
                onRefresh: () async => _reload(),
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 24),
                  children: [
                    FadeSlideIn(
                      delay: const Duration(milliseconds: 0),
                      dy: 8,
                      child: HeroHeader(
                        title:
                            passageRef.trim().isEmpty ? 'Study Session' : passageRef.trim(),
                        subtitle: dateStr,
                        trailing: Icon(Icons.auto_stories_outlined, color: scheme.primary),
                        badges: [
                          HeroBadge(
                            icon: Icons.calendar_today_outlined,
                            label: 'Date',
                            value: DateFormat.MMMd().format(when),
                          ),
                          HeroBadge(
                            icon: Icons.auto_stories_outlined,
                            label: 'Genre',
                            value: genre == 'Unknown' ? 'General' : genre,
                          ),
                        ],
                        bottom: Row(
                          children: [
                            Expanded(
                              child: FilledButton.icon(
                                onPressed: () => _edit(row),
                                icon: const Icon(Icons.edit_outlined),
                                label: const Text('Edit session'),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: () async {
                                  await Navigator.push(
                                    context,
                                    MaterialPageRoute(builder: (_) => const JournalScreen()),
                                  );
                                  if (mounted) _reload();
                                },
                                icon: const Icon(Icons.note_add_outlined),
                                label: const Text('Journal'),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 14),
                    _MicroDivider(accent: scheme.primary),
                    const SizedBox(height: 14),
                    const SectionHeader(
                      icon: Icons.auto_stories_outlined,
                      title: 'Genre Lens',
                      subtitle: 'A quick reminder for how to read this type of passage.',
                    ),
                    AppCard(
                      tier: AppCardTier.low,
                      padding: EdgeInsets.zero,
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 10, vertical: 6),
                                  decoration: BoxDecoration(
                                    borderRadius: BorderRadius.circular(999),
                                    color: scheme.secondaryContainer.withOpacity(0.55),
                                    border: Border.all(color: scheme.outlineVariant),
                                  ),
                                  child: Text(
                                    genre == 'Unknown' ? 'General' : genre,
                                    style: const TextStyle(fontWeight: FontWeight.w900),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Text(
                                    '3 reminders',
                                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                          color: scheme.onSurfaceVariant,
                                          fontWeight: FontWeight.w700,
                                        ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            ...lens.map(_bullet),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 14),
                    const SectionHeader(
                      icon: Icons.public_outlined,
                      title: 'Context',
                      subtitle: 'Keep application accurate by anchoring in the original setting.',
                    ),
                    _contextSnapshotCard(
                      genre: genre,
                      audience: aud,
                      meaning: mean,
                    ),

                    const SizedBox(height: 14),
                    const SectionHeader(
                      icon: Icons.checklist_outlined,
                      title: 'Guided Study',
                      subtitle: 'These sections only appear if you filled them in.',
                    ),

                    _section(
                      icon: Icons.search,
                      title: '1) Important words / observations',
                      body: obs,
                    ),
                    _section(
                      icon: Icons.group_outlined,
                      title: '2) Original audience',
                      body: aud,
                    ),
                    _section(
                      icon: Icons.history_edu_outlined,
                      title: '3) What did it mean to them?',
                      body: mean,
                    ),
                    _section(
                      icon: Icons.compare_arrows,
                      title: '4) How is our context similar?',
                      body: sim,
                    ),
                    _section(
                      icon: Icons.public_outlined,
                      title: '5) How is our context different?',
                      body: diff,
                    ),

                    _applicationCommitmentCard(app: app),

                    if (parts.visibleNotes.trim().isNotEmpty) ...[
                      const SizedBox(height: 14),
                      const SectionHeader(
                        icon: Icons.edit_note_outlined,
                        title: 'Additional Notes',
                        subtitle: 'Extra insights, cross-references, and questions.',
                      ),
                      _section(
                        icon: Icons.edit_note_outlined,
                        title: 'Notes',
                        body: parts.visibleNotes,
                      ),
                    ],

                    const SizedBox(height: 12),
                    AppCard(
                      tier: AppCardTier.mid,
                      padding: EdgeInsets.zero,
                      child: ListTile(
                        leading: const Icon(Icons.note_add_outlined),
                        title: const Text('Add a journal entry'),
                        subtitle: const Text('Journal entries can be linked to this session.'),
                        onTap: () async {
                          await Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const JournalScreen()),
                          );
                          if (mounted) _reload();
                        },
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
class _MicroDivider extends StatelessWidget {
  final Color accent;
  final bool compact;

  const _MicroDivider({
    required this.accent,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    final barH = compact ? 4.0 : 6.0;
    final dot = compact ? 8.0 : 10.0;
    final gap = compact ? 8.0 : 10.0;

    return Row(
      children: [
        Expanded(
          child: Container(
            height: barH,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(999),
              color: accent.withOpacity(0.22),
            ),
          ),
        ),
        SizedBox(width: gap),
        Container(
          width: dot,
          height: dot,
          decoration: BoxDecoration(
            color: accent.withOpacity(0.35),
            shape: BoxShape.circle,
            border: Border.all(color: scheme.outlineVariant.withOpacity(0.45)),
          ),
        ),
      ],
    );
  }
}
