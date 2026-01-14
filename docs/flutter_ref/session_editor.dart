// session_editor.dart
import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:uuid/uuid.dart';
import 'package:url_launcher/url_launcher.dart';

import '../db/app_db.dart';
import '../widgets/hero_header.dart';
import '../widgets/fade_slide_in.dart';

enum StudyTrack { beginner, intermediate, advanced }

extension StudyTrackX on StudyTrack {
  String get label {
    switch (this) {
      case StudyTrack.beginner:
        return 'Beginner';
      case StudyTrack.intermediate:
        return 'Intermediate';
      case StudyTrack.advanced:
        return 'Advanced';
    }
  }
}

class SessionEditor extends StatefulWidget {
  final String planId;

  /// If provided, editor will load and edit an existing session.
  final String? sessionId;

  const SessionEditor({
    super.key,
    required this.planId,
    this.sessionId,
  });

  @override
  State<SessionEditor> createState() => _SessionEditorState();
}

class _SessionEditorState extends State<SessionEditor> {
  // Hidden blocks stored inside notes
  static const String _genreMarker = '\n\n===GENRE===\n';
  static const String _passageMarker = '\n\n===PASSAGE_TEXT===\n';
  static const String _trackMarker = '\n\n===TRACK===\n';
  static const String _advancedMarker = '\n\n===ADVANCED===\n';

  final _uuid = const Uuid();

  String? _sessionId;
  bool _loading = true;
  bool _saving = false;

  DateTime _date = DateTime.now();

  // Track + Genre
  StudyTrack _track = StudyTrack.beginner;
  String _genre = 'Unknown';

  // Basic fields
  final _passageRefCtrl = TextEditingController();

  // Notes (visible only)
  final _notesVisibleCtrl = TextEditingController();

  // Optional pasted passage text
  final _passageTextCtrl = TextEditingController();

  // Guided prompts (core)
  final _obsCtrl = TextEditingController();
  final _audCtrl = TextEditingController();
  final _meanCtrl = TextEditingController();
  final _simCtrl = TextEditingController();
  final _diffCtrl = TextEditingController();
  final _appCtrl = TextEditingController();

  // Advanced prompts (stored in notes hidden block; no DB changes)
  final _advStructureCtrl = TextEditingController();
  final _advThemesCtrl = TextEditingController();
  final _advCrossRefsCtrl = TextEditingController();
  final _advWordStudyCtrl = TextEditingController();
  final _advCommentaryCtrl = TextEditingController();

  // Expand/collapse state (default CLOSED)
  final Map<String, bool> _open = {
    'prayer': false,
    'resources': false,
    'passageText': false,
    'genre': false,

    // Core prompts
    'obs': false,
    'context': false, // Intermediate
    'aud': false,
    'mean': false,
    'sim': false,
    'diff': false,
    'app': false, // guardrails shown when open
    'notes': false,

    // Advanced prompts
    'advStructure': false,
    'advThemes': false,
    'advCrossRefs': false,
    'advWordStudy': false,
    'advCommentary': false,
  };

  Timer? _saveDebounce;
  bool _dirty = false;

  // Scroll helpers (so we can jump to Passage Text after fetching)
  final ScrollController _scroll = ScrollController();
  final GlobalKey _passageTextCardKey = GlobalKey();

  // NET fetch state (UX)
  bool _fetchingNet = false;
  String? _lastNetFetchError;

  // Stopword list for repeated words
  static const Set<String> _stop = {
    'the',
    'and',
    'a',
    'an',
    'to',
    'of',
    'in',
    'on',
    'for',
    'with',
    'by',
    'at',
    'from',
    'as',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'it',
    'this',
    'that',
    'these',
    'those',
    'i',
    'you',
    'he',
    'she',
    'they',
    'we',
    'him',
    'her',
    'them',
    'us',
    'our',
    'your',
    'my',
    'me',
    'his',
    'hers',
    'their',
    'what',
    'who',
    'whom',
    'which',
    'when',
    'where',
    'why',
    'how',
    'not',
    'no',
    'nor',
    'but',
    'or',
    'so',
    'because',
    'therefore',
    'then',
    'than',
    'also',
    'yet',
    'into',
    'out',
    'up',
    'down',
    'over',
    'under',
    'again',
    'shall',
    'will',
    'would',
    'should',
    'could',
    'may',
    'might',
    'must',
    'can',
    'had',
    'has',
    'have',
    'do',
    'does',
    'did',
  };

  // ------------------------------------------------------------
  // Resources (url_launcher) + per-card tools
  // ------------------------------------------------------------

  final List<({String title, String subtitle, String url})> _resources = const [
    (
      title: 'BibleProject — Book Overviews',
      subtitle: 'Quick context + structure for every book.',
      url: 'https://bibleproject.com/explore/book-overviews/'
    ),
    (
      title: 'ESV Bible',
      subtitle: 'Clean passage text for copy/paste',
      url: 'https://www.esv.org/'
    ),
    (
      title: 'NET Bible',
      subtitle: 'Translator notes explain why wording matters',
      url: 'https://netbible.org/'
    ),
    (
      title: 'StepBible — Free study tools',
      subtitle: 'Cross references, lexicon, notes.',
      url: 'https://www.stepbible.org/'
    ),
    (
      title: 'Blue Letter Bible — Interlinear + Lexicon',
      subtitle: 'Word study, original language tools.',
      url: 'https://www.blueletterbible.org/'
    ),
    (
      title: 'GotQuestions (use discernment)',
      subtitle: 'Fast topic summaries; compare with Scripture.',
      url: 'https://www.gotquestions.org/'
    ),
  ];

  // Shortcuts for tools by section
  final Map<String, List<({IconData icon, String label, String url, String tooltip})>> _toolsByCard = {
    'passageText': [
      (
        icon: Icons.open_in_new,
        label: 'NET API (plain text)',
        url: 'https://labs.bible.org/api/?passage=John+3:16-17',
        tooltip: 'Opens NET passage output (easy copy/paste)'
      ),
      (
        icon: Icons.open_in_new,
        label: 'StepBible',
        url: 'https://www.stepbible.org/',
        tooltip: 'Find a passage + compare tools'
      ),
      (icon: Icons.format_quote, label: 'ESV Bible', url: 'https://www.esv.org/', tooltip: 'Clean passage text for copy/paste'),
      (icon: Icons.open_in_new, label: 'BibleGateway', url: 'https://www.biblegateway.com/', tooltip: 'Compare translations before pasting'),
    ],
    'genre': [
      (
        icon: Icons.open_in_new,
        label: 'BibleGateway (Genres)',
        url: 'https://www.biblegateway.com/learn/bible-101/about-the-bible/biblical-genres/',
        tooltip: 'Genre overview + examples'
      ),
      (
        icon: Icons.public_outlined,
        label: 'BibleProject (How to Read)',
        url: 'https://bibleproject.com/videos/collections/how-to-read-the-bible/',
        tooltip: 'Visual + conceptual, very accessible'
      ),
    ],
    'context': [
      (icon: Icons.public_outlined, label: 'BibleProject', url: 'https://bibleproject.com/explore/book-overviews/', tooltip: 'Background + structure'),
      (icon: Icons.call_split_outlined, label: 'StepBible', url: 'https://www.stepbible.org/', tooltip: 'Cross-refs + study tools'),
      (icon: Icons.open_in_new, label: 'Bible Odyssey', url: 'https://www.bibleodyssey.org/', tooltip: 'Cultural background'),
      (icon: Icons.format_quote, label: 'NET Bible', url: 'https://netbible.org/', tooltip: 'Translator notes explain why wording matters'),
    ],
    'obs': [
      (icon: Icons.search, label: 'StepBible', url: 'https://www.stepbible.org/', tooltip: 'Read in context + notes + cross-refs'),
      (icon: Icons.translate_outlined, label: 'BlueLetter', url: 'https://www.blueletterbible.org/', tooltip: 'Interlinear + key word lookups'),
      (icon: Icons.format_quote, label: 'NET Bible', url: 'https://netbible.org/', tooltip: 'Translator notes explain why wording matters'),
      (icon: Icons.open_in_new, label: 'OpenBible (Cross-refs)', url: 'https://www.openbible.info/labs/cross-references/', tooltip: 'Visualizes textual connections'),
    ],
    'aud': [
      (icon: Icons.public_outlined, label: 'BibleProject', url: 'https://bibleproject.com/explore/book-overviews/', tooltip: 'Audience + historical setting'),
      (icon: Icons.open_in_new, label: 'StepBible', url: 'https://www.stepbible.org/', tooltip: 'Notes + background tools'),
    ],
    'mean': [
      (icon: Icons.history_edu_outlined, label: 'BibleProject (Themes)', url: 'https://bibleproject.com/explore/themes/', tooltip: 'Explore themes'),
      (icon: Icons.open_in_new, label: 'StepBible', url: 'https://www.stepbible.org/', tooltip: 'Compare translations + notes'),
      (icon: Icons.open_in_new, label: 'BlueLetter', url: 'https://www.blueletterbible.org/', tooltip: 'Check key terms (don’t overdo it)'),
    ],
    'sim': [
      (icon: Icons.menu_book_outlined, label: 'BibleProject (Themes)', url: 'https://bibleproject.com/explore/themes/', tooltip: 'Themes that carry over'),
      (icon: Icons.open_in_new, label: 'GotQuestions', url: 'https://www.gotquestions.org/', tooltip: 'Topic summary (compare carefully)'),
    ],
    'diff': [
      (icon: Icons.public_outlined, label: 'BibleProject (Covenants)', url: 'https://bibleproject.com/videos/covenants/', tooltip: 'Covenant/storyline differences'),
      (icon: Icons.call_split_outlined, label: 'StepBible', url: 'https://www.stepbible.org/', tooltip: 'Cross-refs to clarify scope'),
    ],
    'app': [
      (icon: Icons.menu_book_outlined, label: 'BibleProject (Character of God)', url: 'https://bibleproject.com/videos/collections/character-of-god/', tooltip: 'Keep application God-centered'),
    ],
    'notes': [
      (icon: Icons.call_split_outlined, label: 'StepBible', url: 'https://www.stepbible.org/', tooltip: 'Quick cross-refs to capture in notes'),
    ],
    'advStructure': [
      (icon: Icons.account_tree_outlined, label: 'BibleProject', url: 'https://bibleproject.com/explore/book-overviews/', tooltip: 'Structure + flow overview'),
      (icon: Icons.format_quote, label: 'NET Bible', url: 'https://netbible.org/', tooltip: 'Translator notes explain why wording matters'),
    ],
    'advThemes': [
      (icon: Icons.lightbulb_outline, label: 'BibleProject (Themes)', url: 'https://bibleproject.com/explore/themes/', tooltip: 'Themes across the book'),
      (icon: Icons.call_split_outlined, label: 'StepBible', url: 'https://www.stepbible.org/', tooltip: 'Theme tracing via cross-refs'),
    ],
    'advCrossRefs': [
      (icon: Icons.call_split_outlined, label: 'StepBible', url: 'https://www.stepbible.org/', tooltip: 'Cross-refs + parallels'),
      (icon: Icons.format_quote, label: 'TSK', url: 'https://thetreasuryofscriptureknowledge.com/', tooltip: 'Cross-ref density'),
    ],
    'advWordStudy': [
      (icon: Icons.translate_outlined, label: 'BlueLetter', url: 'https://www.blueletterbible.org/', tooltip: 'Interlinear + lexicon'),
      (icon: Icons.open_in_new, label: 'StepBible', url: 'https://www.stepbible.org/', tooltip: 'Greek/Hebrew tools + cross-refs'),
    ],
    'advCommentary': [
      (icon: Icons.open_in_new, label: 'BibleProject', url: 'https://bibleproject.com/explore/book-overviews/', tooltip: 'Big-picture check'),
      (icon: Icons.open_in_new, label: 'GotQuestions', url: 'https://www.gotquestions.org/', tooltip: 'Quick summary (compare carefully)'),
    ],
  };

  Future<void> _openUrl(String url) async {
    final uri = Uri.tryParse(url);
    if (uri == null) return;

    final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);

    if (!ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not open link')),
      );
    }
  }

  // ------------------------------------------------------------
  // ✅ Bible reference detection (chips) + preview sheet
  // ------------------------------------------------------------

  // A practical matcher that catches the common cases:
  // - John 3:16
  // - 1 Cor 13:4–7
  // - Gen. 1:1-2; 2:3
  // - Rom 5
  //
  // Not perfect (Bible reference parsing is gnarly), but great UX.
  static final RegExp _refRegex = RegExp(
    r'(?:(?:[1-3]\s*)?[A-Za-z][A-Za-z\.]{1,15}(?:\s+[A-Za-z][A-Za-z\.]{1,15})?)\s+\d{1,3}'
    r'(?:\s*:\s*\d{1,3}(?:\s*[-–]\s*\d{1,3})?)?'
    r'(?:\s*,\s*\d{1,3}(?:\s*[-–]\s*\d{1,3})?)*'
    r'(?:\s*;\s*(?:\d{1,3})(?:\s*:\s*\d{1,3}(?:\s*[-–]\s*\d{1,3})?)?)?',
  );

  List<String> _extractRefs(String text, {int max = 6}) {
    final matches = _refRegex.allMatches(text);
    if (matches.isEmpty) return const [];

    final out = <String>[];
    final seen = <String>{};

    for (final m in matches) {
      var s = text.substring(m.start, m.end).trim();
      if (s.isEmpty) continue;

      // normalize some common punctuation
      s = s.replaceAll('–', '-');
      s = s.replaceAll(RegExp(r'\s+'), ' ');

      // Avoid false positives that are obviously not scripture refs
      if (s.length < 6) continue;

      final key = s.toLowerCase();
      if (seen.contains(key)) continue;

      seen.add(key);
      out.add(s);

      if (out.length >= max) break;
    }
    return out;
  }

  Uri _netApiUriPlainText(String passage) {
    return Uri.parse('https://labs.bible.org/api/').replace(queryParameters: {
      'passage': passage,
      'formatting': 'plain',
      'type': 'text',
    });
  }

  Uri _netApiUriJson(String passage) {
    return Uri.parse('https://labs.bible.org/api/').replace(queryParameters: {
      'passage': passage,
      'formatting': 'plain',
      'type': 'json',
    });
  }

  String _formatNetJson(dynamic decoded) {
    if (decoded is List) {
      final lines = <String>[];
      for (final item in decoded) {
        if (item is Map) {
          final book = (item['bookname'] ?? item['book'] ?? item['book_name'] ?? '').toString().trim();
          final chapter = (item['chapter'] ?? '').toString().trim();
          final verse = (item['verse'] ?? '').toString().trim();
          final text = (item['text'] ?? item['verseText'] ?? item['verse_text'] ?? '').toString().trim();

          final ref = [
            if (book.isNotEmpty) book,
            if (chapter.isNotEmpty && verse.isNotEmpty) '$chapter:$verse' else if (chapter.isNotEmpty) chapter,
          ].join(' ').trim();

          if (ref.isNotEmpty && text.isNotEmpty) {
            lines.add('$ref $text');
          } else if (text.isNotEmpty) {
            lines.add(text);
          }
        } else if (item != null) {
          lines.add(item.toString());
        }
      }
      return lines.join('\n');
    }

    if (decoded is Map) {
      final candidates = ['data', 'verses', 'result', 'results'];
      for (final k in candidates) {
        final v = decoded[k];
        if (v is List) return _formatNetJson(v);
      }
      return decoded.toString();
    }

    return decoded?.toString() ?? '';
  }

  Future<String> _fetchNetTextForPassage(String passage) async {
    // Try JSON first (structured), then fall back to plain text.
    final jsonUri = _netApiUriJson(passage);
    final jsonRes = await http.get(jsonUri);

    String text = '';
    if (jsonRes.statusCode >= 200 && jsonRes.statusCode < 300) {
      try {
        final decoded = json.decode(jsonRes.body);
        text = _formatNetJson(decoded).trim();
      } catch (_) {
        text = '';
      }
    }

    if (text.isEmpty) {
      final textUri = _netApiUriPlainText(passage);
      final textRes = await http.get(textUri);
      if (textRes.statusCode < 200 || textRes.statusCode >= 300) {
        throw Exception('NET API returned ${textRes.statusCode}.');
      }
      text = textRes.body.trim();
    }

    if (text.isEmpty) {
      throw Exception('No text returned. Try a different reference format.');
    }

    // light attribution (fits most use cases; user can delete if they want)
    if (!text.toLowerCase().contains('net bible')) {
      text = '$text\n\n— NET Bible (via labs.bible.org)';
    }
    return text;
  }

  Future<void> _showVersePreviewSheet(String passage, {TextEditingController? insertTarget}) async {
    final scheme = Theme.of(context).colorScheme;

    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      backgroundColor: scheme.surface,
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
            child: ConstrainedBox(
              constraints: BoxConstraints(
                maxHeight: MediaQuery.of(ctx).size.height * 0.75,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.auto_stories_outlined, color: scheme.primary),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          passage,
                          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      IconButton(
                        tooltip: 'Close',
                        onPressed: () => Navigator.pop(ctx),
                        icon: const Icon(Icons.close),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  Expanded(
                    child: FutureBuilder<String>(
                      future: _fetchNetTextForPassage(passage),
                      builder: (context, snap) {
                        if (snap.connectionState == ConnectionState.waiting) {
                          return const Center(child: CircularProgressIndicator());
                        }

                        if (snap.hasError) {
                          final msg = kIsWeb
                              ? 'Could not fetch in browser (CORS is common). Use “Open NET (text)” and paste manually.'
                              : 'Could not fetch. Use “Open NET (text)” and paste manually.';
                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Card(
                                margin: EdgeInsets.zero,
                                child: Padding(
                                  padding: const EdgeInsets.all(12),
                                  child: Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Icon(Icons.warning_amber_outlined, color: scheme.error),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: Text(
                                          '$msg\n\nError: ${snap.error}',
                                          style: TextStyle(color: scheme.onSurface),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              const SizedBox(height: 12),
                              Wrap(
                                spacing: 10,
                                runSpacing: 10,
                                children: [
                                  OutlinedButton.icon(
                                    onPressed: () => _openUrl(_netApiUriPlainText(passage).toString()),
                                    icon: const Icon(Icons.open_in_new),
                                    label: const Text('Open NET (text)'),
                                  ),
                                  OutlinedButton.icon(
                                    onPressed: () async {
                                      await Clipboard.setData(ClipboardData(text: passage));
                                      if (mounted) {
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          const SnackBar(content: Text('Reference copied')),
                                        );
                                      }
                                    },
                                    icon: const Icon(Icons.copy),
                                    label: const Text('Copy reference'),
                                  ),
                                ],
                              ),
                            ],
                          );
                        }

                        final text = snap.data ?? '';
                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Expanded(
                              child: SingleChildScrollView(
                                child: Card(
                                  margin: EdgeInsets.zero,
                                  child: Padding(
                                    padding: const EdgeInsets.all(12),
                                    child: Text(
                                      text,
                                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(height: 1.35),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 12),
                            Wrap(
                              spacing: 10,
                              runSpacing: 10,
                              children: [
                                FilledButton.icon(
                                  onPressed: () async {
                                    await Clipboard.setData(ClipboardData(text: text));
                                    if (mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(content: Text('Passage copied')),
                                      );
                                    }
                                  },
                                  icon: const Icon(Icons.copy),
                                  label: const Text('Copy'),
                                ),
                                OutlinedButton.icon(
                                  onPressed: () => _openUrl(_netApiUriPlainText(passage).toString()),
                                  icon: const Icon(Icons.open_in_new),
                                  label: const Text('Open NET (text)'),
                                ),
                                if (insertTarget != null)
                                  OutlinedButton.icon(
                                    onPressed: () {
                                      _insertInto(insertTarget, '[$passage]\n$text');
                                      Navigator.pop(ctx);
                                      if (mounted) {
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          const SnackBar(content: Text('Inserted into your field')),
                                        );
                                      }
                                    },
                                    icon: const Icon(Icons.note_add_outlined),
                                    label: const Text('Insert'),
                                  ),
                                OutlinedButton.icon(
                                  onPressed: () {
                                    _insertInto(_notesVisibleCtrl, '[$passage]\n$text');
                                    Navigator.pop(ctx);
                                    if (mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(content: Text('Inserted into Notes')),
                                      );
                                    }
                                  },
                                  icon: const Icon(Icons.edit_note),
                                  label: const Text('Insert into Notes'),
                                ),
                              ],
                            ),
                          ],
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _detectedRefsRow(String sourceText, {TextEditingController? insertTarget}) {
    final refs = _extractRefs(sourceText, max: 6);
    if (refs.isEmpty) return const SizedBox.shrink();

    final scheme = Theme.of(context).colorScheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 10),
        Row(
          children: [
            Icon(Icons.link_outlined, size: 16, color: scheme.onSurfaceVariant),
            const SizedBox(width: 6),
            Expanded(
              child: Text(
                'Detected references (tap to preview)',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: scheme.onSurfaceVariant,
                      fontWeight: FontWeight.w700,
                    ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final r in refs)
              ActionChip(
                label: Text(r),
                avatar: const Icon(Icons.auto_stories_outlined, size: 18),
                onPressed: () => _showVersePreviewSheet(r, insertTarget: insertTarget),
              ),
          ],
        ),
      ],
    );
  }

  // ------------------------------------------------------------
  // ✅ NET API: Fetch passage text button (from Passage reference)
  // ------------------------------------------------------------

  String _passageRefForApi() {
    final raw = _passageRefCtrl.text.trim();
    return raw.replaceAll('–', '-');
  }

  Future<void> _fetchNetPassageText({bool overwrite = false}) async {
    final passage = _passageRefForApi();
    if (passage.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter a passage reference first (e.g., John 1:1–18).')),
      );
      return;
    }

    if (!overwrite && _passageTextCtrl.text.trim().isNotEmpty) {
      final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Replace existing passage text?'),
          content: const Text('You already have text pasted. Do you want to replace it with NET text?'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Replace')),
          ],
        ),
      );
      if (ok != true) return;
    }

    setState(() {
      _fetchingNet = true;
      _lastNetFetchError = null;
    });

    try {
      final text = await _fetchNetTextForPassage(passage);

      if (!mounted) return;

      setState(() {
        _open['passageText'] = true;
        _passageTextCtrl.text = text;
        _dirty = true;
      });

      WidgetsBinding.instance.addPostFrameCallback((_) async {
        final ctx = _passageTextCardKey.currentContext;
        if (ctx != null) {
          await Scrollable.ensureVisible(
            ctx,
            duration: const Duration(milliseconds: 260),
            curve: Curves.easeOut,
            alignment: 0.1,
          );
        }
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Loaded NET text for: $passage')),
        );
      }
    } catch (e) {
      if (!mounted) return;

      setState(() {
        _lastNetFetchError = e.toString();
      });

      final msg = kIsWeb
          ? 'Could not fetch NET text in the browser. Tap “Open NET (text)” and paste it manually.'
          : 'Could not fetch NET text. Try “Open NET (text)” and paste manually.';

      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
    } finally {
      if (mounted) {
        setState(() => _fetchingNet = false);
      }
    }
  }

  void _openNetPlainInBrowser() {
    final passage = _passageRefForApi();
    if (passage.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter a passage reference first.')),
      );
      return;
    }
    _openUrl(_netApiUriPlainText(passage).toString());
  }

  void _openStepBible() {
    _openUrl('https://www.stepbible.org/');
  }

  // ------------------------------------------------------------
  // Tools sheet + cards
  // ------------------------------------------------------------

  void _openToolsSheet(String keyName, {String? titleOverride}) {
    final tools = _toolsByCard[keyName] ?? const [];
    if (tools.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No tools linked for this step yet.')),
      );
      return;
    }

    final scheme = Theme.of(context).colorScheme;
    final String title = titleOverride ?? 'Tools';

    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      backgroundColor: scheme.surface,
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
            child: ConstrainedBox(
              constraints: BoxConstraints(
                maxHeight: MediaQuery.of(ctx).size.height * 0.55,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.handyman_outlined, color: scheme.primary),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          title,
                          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
                        ),
                      ),
                      IconButton(
                        tooltip: 'Close',
                        onPressed: () => Navigator.pop(ctx),
                        icon: const Icon(Icons.close),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Tap a tool to open it in your browser.',
                    style: Theme.of(ctx).textTheme.bodySmall?.copyWith(
                          color: scheme.onSurfaceVariant,
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                  const SizedBox(height: 10),
                  Expanded(
                    child: ListView.separated(
                      itemCount: tools.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (_, i) {
                        final t = tools[i];
                        return Card(
                          margin: EdgeInsets.zero,
                          child: ListTile(
                            leading: Icon(t.icon, color: scheme.primary),
                            title: Text(t.label, style: const TextStyle(fontWeight: FontWeight.w900)),
                            subtitle: Text(t.tooltip),
                            trailing: const Icon(Icons.open_in_new),
                            onTap: () async {
                              Navigator.pop(ctx);
                              await _openUrl(t.url);
                            },
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _cardHeader({
    required String keyName,
    required IconData icon,
    required String title,
    required bool open,
    required VoidCallback onToggle,
    String? toolsTitle,
    bool showToolsButton = true,
  }) {
    final scheme = Theme.of(context).colorScheme;

    return Row(
      children: [
        // Icon chip (color identity)
        Builder(builder: (context) {
          final cs = Theme.of(context).colorScheme;
          Color accent;
          Color bg;
          switch (keyName) {
            case 'sim':
            case 'diff':
              accent = cs.secondary;
              bg = cs.secondaryContainer;
              break;
            case 'app':
              accent = cs.tertiary;
              bg = cs.tertiaryContainer;
              break;
            case 'notes':
              accent = cs.secondary;
              bg = cs.secondaryContainer;
              break;
            default:
              // obs, aud, mean, advanced*, setup etc.
              accent = cs.primary;
              bg = cs.primaryContainer;
          }
          return Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: bg.withOpacity(0.75),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: cs.outlineVariant.withOpacity(0.55)),
            ),
            alignment: Alignment.center,
            child: Icon(icon, color: accent, size: 18),
          );
        }),
        const SizedBox(width: 10),
        Expanded(
          child: InkWell(
            borderRadius: BorderRadius.circular(14),
            onTap: onToggle,
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      title,
                      style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
                    ),
                  ),
                  Icon(open ? Icons.expand_less : Icons.expand_more),
                ],
              ),
            ),
          ),
        ),
        if (showToolsButton) ...[
          const SizedBox(width: 8),
          IconButton(
            tooltip: 'Tools',
            icon: const Icon(Icons.handyman_outlined),
            onPressed: () => _openToolsSheet(
              keyName,
              titleOverride: toolsTitle ?? 'Tools for this step',
            ),
          ),
        ],
      ],
    );
  }

  Widget _toolsHintLine() {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Row(
        children: [
          Icon(Icons.handyman_outlined, size: 16, color: scheme.onSurfaceVariant),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              'Tip: Use the Tools (wrench) icon to open resources without expanding this card.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: scheme.onSurfaceVariant,
                    fontWeight: FontWeight.w700,
                  ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  void initState() {
    super.initState();
    _sessionId = widget.sessionId;
    _wireAutosave();
    _loadOrCreate();
  }

  void _wireAutosave() {
    void markDirty({bool rebuild = false}) {
      _dirty = true;
      _saveDebounce?.cancel();
      _saveDebounce = Timer(const Duration(milliseconds: 450), () {
        if (!mounted) return;
        _saveIfNeeded(showSnack: false);
      });
      if (rebuild && mounted) setState(() {});
    }

    // rebuild more often so detected ref chips update live
    _passageRefCtrl.addListener(() => markDirty(rebuild: true));
    _notesVisibleCtrl.addListener(() => markDirty(rebuild: true));
    _passageTextCtrl.addListener(() => markDirty(rebuild: true));

    _obsCtrl.addListener(() => markDirty(rebuild: true));
    _audCtrl.addListener(() => markDirty(rebuild: true));
    _meanCtrl.addListener(() => markDirty(rebuild: true));
    _simCtrl.addListener(() => markDirty(rebuild: true));
    _diffCtrl.addListener(() => markDirty(rebuild: true));
    _appCtrl.addListener(() => markDirty(rebuild: true));

    _advStructureCtrl.addListener(() => markDirty(rebuild: true));
    _advThemesCtrl.addListener(() => markDirty(rebuild: true));
    _advCrossRefsCtrl.addListener(() => markDirty(rebuild: true));
    _advWordStudyCtrl.addListener(() => markDirty(rebuild: true));
    _advCommentaryCtrl.addListener(() => markDirty(rebuild: true));
  }

  @override
  void dispose() {
    _saveDebounce?.cancel();
    _scroll.dispose();

    _passageRefCtrl.dispose();
    _notesVisibleCtrl.dispose();
    _passageTextCtrl.dispose();

    _obsCtrl.dispose();
    _audCtrl.dispose();
    _meanCtrl.dispose();
    _simCtrl.dispose();
    _diffCtrl.dispose();
    _appCtrl.dispose();

    _advStructureCtrl.dispose();
    _advThemesCtrl.dispose();
    _advCrossRefsCtrl.dispose();
    _advWordStudyCtrl.dispose();
    _advCommentaryCtrl.dispose();

    super.dispose();
  }

  Future<void> _loadOrCreate() async {
    setState(() => _loading = true);

    if (_sessionId != null) {
      final row = await AppDb.instance.getSession(_sessionId!);
      if (row != null) _hydrateFromRow(row);
      setState(() => _loading = false);
      await _saveIfNeeded(showSnack: false, force: true);
      return;
    }

    final id = _uuid.v4();
    final nowMs = DateTime.now().millisecondsSinceEpoch;

    await AppDb.instance.insertSession(
      id: id,
      planId: widget.planId,
      sessionDateMs: nowMs,
      passage: '',
      notes: '',
    );

    _sessionId = id;
    _date = DateTime.fromMillisecondsSinceEpoch(nowMs);

    setState(() => _loading = false);
    await _saveIfNeeded(showSnack: false, force: true);
  }

  void _hydrateFromRow(Map<String, Object?> row) {
    final dateMs = (row['session_date'] as int?) ?? DateTime.now().millisecondsSinceEpoch;
    _date = DateTime.fromMillisecondsSinceEpoch(dateMs);

    _passageRefCtrl.text = (row['passage'] as String?) ?? '';

    final rawNotes = (row['notes'] as String?) ?? '';
    final parts = _extractNotesBlocks(rawNotes);

    _notesVisibleCtrl.text = parts.visibleNotes;
    _genre = parts.genre.isEmpty ? 'Unknown' : parts.genre;
    _passageTextCtrl.text = parts.passageText;

    _track = _parseTrack(parts.track);

    _obsCtrl.text = (row['observations'] as String?) ?? '';
    _audCtrl.text = (row['original_audience'] as String?) ?? (row['originalAudience'] as String?) ?? '';
    _meanCtrl.text = (row['original_meaning'] as String?) ?? (row['originalMeaning'] as String?) ?? '';
    _simCtrl.text = (row['similar_context'] as String?) ?? (row['similarContext'] as String?) ?? '';
    _diffCtrl.text = (row['different_context'] as String?) ?? (row['differentContext'] as String?) ?? '';
    _appCtrl.text = (row['application'] as String?) ?? '';

    _advStructureCtrl.text = parts.adv['structure'] ?? '';
    _advThemesCtrl.text = parts.adv['themes'] ?? '';
    _advCrossRefsCtrl.text = parts.adv['crossrefs'] ?? '';
    _advWordStudyCtrl.text = parts.adv['wordstudy'] ?? '';
    _advCommentaryCtrl.text = parts.adv['commentary'] ?? '';

    _dirty = false;
  }

  StudyTrack _parseTrack(String raw) {
    final t = raw.trim().toLowerCase();
    if (t == 'advanced') return StudyTrack.advanced;
    if (t == 'intermediate') return StudyTrack.intermediate;
    if (t == 'beginner') return StudyTrack.beginner;
    return StudyTrack.beginner;
  }

  // ---- Hidden block parsing ----
  ({
    String visibleNotes,
    String genre,
    String passageText,
    String track,
    Map<String, String> adv,
  }) _extractNotesBlocks(String raw) {
    String visible = raw;
    String genre = '';
    String passage = '';
    String track = '';
    Map<String, String> adv = {};

    final gIdx = raw.indexOf(_genreMarker);
    final pIdx = raw.indexOf(_passageMarker);
    final tIdx = raw.indexOf(_trackMarker);
    final aIdx = raw.indexOf(_advancedMarker);

    final markers = <int>[];
    if (gIdx >= 0) markers.add(gIdx);
    if (pIdx >= 0) markers.add(pIdx);
    if (tIdx >= 0) markers.add(tIdx);
    if (aIdx >= 0) markers.add(aIdx);
    markers.sort();

    if (markers.isNotEmpty) {
      visible = raw.substring(0, markers.first).trimRight();
    } else {
      visible = raw.trimRight();
    }

    String sectionAfter(int idx, String marker) => raw.substring(idx + marker.length);

    if (gIdx >= 0) {
      final after = sectionAfter(gIdx, _genreMarker);
      final next = _nextMarkerIndex(after);
      genre = (next >= 0 ? after.substring(0, next) : after).trim();
    }

    if (tIdx >= 0) {
      final after = sectionAfter(tIdx, _trackMarker);
      final next = _nextMarkerIndex(after);
      track = (next >= 0 ? after.substring(0, next) : after).trim();
    }

    if (pIdx >= 0) {
      final after = sectionAfter(pIdx, _passageMarker);
      final next = _nextMarkerIndex(after);
      passage = (next >= 0 ? after.substring(0, next) : after).trim();
    }

    if (aIdx >= 0) {
      final after = sectionAfter(aIdx, _advancedMarker);
      final next = _nextMarkerIndex(after);
      final block = (next >= 0 ? after.substring(0, next) : after).trim();
      adv = _parseAdvancedBlock(block);
    }

    return (
      visibleNotes: visible,
      genre: genre,
      passageText: passage,
      track: track,
      adv: adv,
    );
  }

  int _nextMarkerIndex(String text) {
    final idxs = <int>[
      text.indexOf(_genreMarker),
      text.indexOf(_trackMarker),
      text.indexOf(_passageMarker),
      text.indexOf(_advancedMarker),
    ].where((i) => i >= 0).toList();
    if (idxs.isEmpty) return -1;
    idxs.sort();
    return idxs.first;
  }

  Map<String, String> _parseAdvancedBlock(String block) {
    final out = <String, String>{};
    if (block.trim().isEmpty) return out;

    String key = '';
    final buf = StringBuffer();

    void flush() {
      final k = key.trim();
      if (k.isEmpty) return;
      out[k] = buf.toString().trim();
    }

    for (final line in block.split('\n')) {
      final m = RegExp(r'^([a-zA-Z_]+)\s*:\s*(.*)$').firstMatch(line);
      if (m != null) {
        flush();
        key = m.group(1)!.trim().toLowerCase();
        buf
          ..clear()
          ..write(m.group(2) ?? '');
      } else {
        if (key.isEmpty) continue;
        buf.write('\n$line');
      }
    }
    flush();
    return out;
  }

  String _buildAdvancedBlock() {
    final m = <String, String>{
      'structure': _advStructureCtrl.text.trim(),
      'themes': _advThemesCtrl.text.trim(),
      'crossrefs': _advCrossRefsCtrl.text.trim(),
      'wordstudy': _advWordStudyCtrl.text.trim(),
      'commentary': _advCommentaryCtrl.text.trim(),
    };

    final lines = <String>[];
    for (final e in m.entries) {
      if (e.value.isEmpty) continue;
      lines.add('${e.key}: ${e.value.replaceAll('\n', '\n')}');
    }
    return lines.join('\n');
  }

  String _combineNotes({
    required String visibleNotes,
    required String genre,
    required String passageText,
    required StudyTrack track,
  }) {
    final v = visibleNotes.trimRight();
    final g = genre.trim();
    final p = passageText.trim();
    final t = track.label;

    final advBlock = _buildAdvancedBlock().trim();

    final buf = StringBuffer();
    if (v.isNotEmpty) buf.write(v);

    buf.write(_trackMarker);
    buf.write(t);

    buf.write(_genreMarker);
    buf.write(g.isEmpty ? 'Unknown' : g);

    if (p.isNotEmpty) {
      buf.write(_passageMarker);
      buf.write(p);
    }

    if (advBlock.isNotEmpty) {
      buf.write(_advancedMarker);
      buf.write(advBlock);
    }

    return buf.toString();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
    );
    if (picked == null) return;

    setState(() {
      _date = DateTime(picked.year, picked.month, picked.day, _date.hour, _date.minute);
      _dirty = true;
    });

    await _saveIfNeeded(showSnack: false);
  }

  Future<void> _saveIfNeeded({required bool showSnack, bool force = false}) async {
    final id = _sessionId;
    if (id == null) return;

    if (!force && !_dirty && !showSnack) return;

    setState(() => _saving = true);

    try {
      final combinedNotes = _combineNotes(
        visibleNotes: _notesVisibleCtrl.text,
        genre: _genre,
        passageText: _passageTextCtrl.text,
        track: _track,
      );

      await AppDb.instance.updateSessionBasic(
        id: id,
        sessionDateMs: _date.millisecondsSinceEpoch,
        passage: _passageRefCtrl.text.trim(),
        notes: combinedNotes,
      );

      await AppDb.instance.updateSessionGuided(
        id: id,
        notes: combinedNotes,
        observations: _obsCtrl.text,
        originalAudience: _audCtrl.text,
        originalMeaning: _meanCtrl.text,
        similarContext: _simCtrl.text,
        differentContext: _diffCtrl.text,
        application: _appCtrl.text,
      );

      _dirty = false;

      if (showSnack && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Session saved')),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  // ------------------------------------------------------------
  // Beginner/Intermediate gating
  // ------------------------------------------------------------

  bool get _showIntermediate => _track == StudyTrack.intermediate || _track == StudyTrack.advanced;
  bool get _showAdvanced => _track == StudyTrack.advanced;

  // ------------------------------------------------------------
  // Prayer card
  // ------------------------------------------------------------

  Widget _prayerCard() {
    final open = _open['prayer'] ?? false;
    final scheme = Theme.of(context).colorScheme;

    return Card(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 14, 14, 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _cardHeader(
              keyName: 'prayer',
              icon: Icons.volunteer_activism_outlined,
              title: 'Prayer before you study',
              open: open,
              onToggle: () => setState(() => _open['prayer'] = !open),
              showToolsButton: false,
            ),
            const SizedBox(height: 6),
            Text(
              'Pause. Ask God for clarity, humility, and obedience.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            AnimatedCrossFade(
              firstChild: const SizedBox(height: 0),
              secondChild: Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Card(
                  margin: EdgeInsets.zero,
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Simple prayer (optional)',
                          style: TextStyle(fontWeight: FontWeight.w900),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          '“Lord, open my eyes to understand Your Word. '
                          'Guard me from bias and pride. '
                          'Help me believe what is true, and obey what You show me. '
                          'Shape me into someone who loves You and loves people. Amen.”',
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                height: 1.35,
                                color: scheme.onSurface,
                              ),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          'Tip: If you’re distracted, write one sentence: “Today I need help with ___.”',
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: scheme.onSurfaceVariant,
                                fontWeight: FontWeight.w600,
                              ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              crossFadeState: open ? CrossFadeState.showSecond : CrossFadeState.showFirst,
              duration: const Duration(milliseconds: 200),
            ),
          ],
        ),
      ),
    );
  }

  // ------------------------------------------------------------
  // Resources card
  // ------------------------------------------------------------

  Widget _resourcesCard() {
    final open = _open['resources'] ?? false;
    final scheme = Theme.of(context).colorScheme;

    return Card(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 14, 14, 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _cardHeader(
              keyName: 'resources',
              icon: Icons.link_outlined,
              title: 'Free resources (all)',
              open: open,
              onToggle: () => setState(() => _open['resources'] = !open),
              showToolsButton: false,
            ),
            const SizedBox(height: 6),
            Text(
              'Global list of tools you can reference anytime.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            AnimatedCrossFade(
              firstChild: const SizedBox(height: 0),
              secondChild: Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Column(
                  children: [
                    for (final r in _resources)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Card(
                          margin: EdgeInsets.zero,
                          child: ListTile(
                            leading: Icon(Icons.open_in_new, color: scheme.primary),
                            title: Text(r.title, style: const TextStyle(fontWeight: FontWeight.w900)),
                            subtitle: Text(r.subtitle),
                            onTap: () => _openUrl(r.url),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              crossFadeState: open ? CrossFadeState.showSecond : CrossFadeState.showFirst,
              duration: const Duration(milliseconds: 200),
            ),
          ],
        ),
      ),
    );
  }

  // ------------------------------------------------------------
  // Application Guardrails (unchanged)
  // ------------------------------------------------------------

  bool get _hasAudience => _audCtrl.text.trim().isNotEmpty;
  bool get _hasMeaning => _meanCtrl.text.trim().isNotEmpty;
  bool get _hasSimilar => _simCtrl.text.trim().isNotEmpty;
  bool get _hasDifferent => _diffCtrl.text.trim().isNotEmpty;
  bool get _hasObservation => _obsCtrl.text.trim().isNotEmpty;

  int _applicationReadinessScore() {
    int s = 0;
    if (_hasObservation) s++;
    if (_hasAudience) s++;
    if (_hasMeaning) s++;
    if (_hasSimilar) s++;
    if (_hasDifferent) s++;
    return s; // 0..5
  }

  List<String> _applicationWarnings() {
    final warnings = <String>[];

    if (!_hasAudience) warnings.add('Add “Original audience” before applying.');
    if (!_hasMeaning) warnings.add('Add “Meaning to them” before applying.');
    if (!_hasSimilar) warnings.add('Write at least 1 similarity to bridge contexts.');
    if (!_hasDifferent) warnings.add('Write at least 1 difference to avoid misapplication.');

    final app = _appCtrl.text.trim();
    if (app.isEmpty) return warnings;

    const vaguePhrases = [
      'be better',
      'do better',
      'try harder',
      'just',
      'feel',
      'nice',
      'good',
      'love people',
      'be kind',
      'be loving',
      'have faith',
      'trust god',
      'pray more',
      'read more',
      'go to church',
    ];
    final lower = app.toLowerCase();
    if (vaguePhrases.any((p) => lower.contains(p))) {
      warnings.add('Your application sounds generic — make it specific and measurable.');
    }

    const anchors = ['because', 'therefore', 'so that', 'since', 'in light of', 'as a result'];
    if (!anchors.any((a) => lower.contains(a))) {
      warnings.add('Add a “why” link (because/therefore/so that) tied to the text.');
    }

    const firstPerson = ['i will', 'i am going to', 'today i', 'this week i', 'i plan to'];
    if (!firstPerson.any((p) => lower.contains(p))) {
      warnings.add('Rewrite as a first-person commitment (e.g., “This week I will…”).');
    }

    const timeWords = ['today', 'tonight', 'this week', 'this month', 'by', 'before', 'on ', 'tomorrow'];
    if (!timeWords.any((t) => lower.contains(t))) {
      warnings.add('Add a timeframe (today/this week/by Friday) to make it actionable.');
    }

    return warnings;
  }

  void _insertInto(TextEditingController ctrl, String line) {
    final current = ctrl.text.trimRight();
    if (current.isEmpty) {
      ctrl.text = line.trimRight();
    } else {
      ctrl.text = '$current\n${line.trimRight()}';
    }
    ctrl.selection = TextSelection.collapsed(offset: ctrl.text.length);
  }

  void _insertApplicationTemplate(String kind) {
    switch (kind) {
      case 'specific':
        _insertInto(_appCtrl, 'This week I will ___ (specific action) because ___ (text-based reason).');
        _insertInto(_appCtrl, 'I will do this by ___ (date/time).');
        _insertInto(_appCtrl, 'If I fail, I will ___ (reset plan).');
        break;
      case 'relationship':
        _insertInto(_appCtrl, 'This week I will initiate ___ (specific conversation/action) with ___ because ___.');
        _insertInto(_appCtrl, 'My measurable step: ___ (call/text/meet) by ___.');
        break;
      case 'habit':
        _insertInto(_appCtrl, 'For the next 7 days, I will ___ (habit) at ___ (time/place) because ___.');
        _insertInto(_appCtrl, 'My trigger: when ___, then I will ___.');
        break;
      case 'prayer':
        _insertInto(_appCtrl, 'Today I will pray: “Lord, help me ___ because ___.”');
        _insertInto(_appCtrl, 'I will write down 1 answered prayer by ___.');
        break;
      default:
        _insertInto(_appCtrl, 'This week I will ___ because ___.');
    }
  }

  Widget _applicationGuardrailsPanel() {
    final score = _applicationReadinessScore();
    final warnings = _applicationWarnings();

    final bool beginnerMode = !_showIntermediate;
    final bool readyByScore = score >= 4;

    final String statusLabel = beginnerMode ? 'Optional' : (readyByScore ? 'Ready' : 'Not ready');

    final Color statusColor = beginnerMode
        ? Theme.of(context).colorScheme.onSurfaceVariant
        : (readyByScore ? Theme.of(context).colorScheme.primary : Theme.of(context).colorScheme.onSurfaceVariant);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                'Application helper',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w900),
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(999),
                border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
              ),
              child: Text(
                statusLabel,
                style: TextStyle(fontWeight: FontWeight.w900, color: statusColor),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (beginnerMode) ...[
          Text(
            'You’re on Beginner track — you can write application now. The “readiness” checks below are for Intermediate/Advanced where context fields are required.',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                  fontWeight: FontWeight.w600,
                ),
          ),
          const SizedBox(height: 10),
        ],
        Row(
          children: [
            Expanded(
              child: LinearProgressIndicator(
                value: score / 5.0,
                minHeight: 8,
                borderRadius: BorderRadius.circular(999),
              ),
            ),
            const SizedBox(width: 10),
            Text('$score/5', style: const TextStyle(fontWeight: FontWeight.w900)),
          ],
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            _checkChip('Observation', _hasObservation),
            _checkChip('Audience', _hasAudience),
            _checkChip('Meaning', _hasMeaning),
            _checkChip('Similar', _hasSimilar),
            _checkChip('Different', _hasDifferent),
          ],
        ),
        const SizedBox(height: 10),
        if (warnings.isNotEmpty) ...[
          Card(
            margin: EdgeInsets.zero,
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.warning_amber_outlined, color: Theme.of(context).colorScheme.error),
                      const SizedBox(width: 8),
                      Text(
                        beginnerMode ? 'Helpful checks (optional)' : 'Guardrail warnings',
                        style: const TextStyle(fontWeight: FontWeight.w900),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  ...warnings.take(5).map(
                        (w) => Padding(
                          padding: const EdgeInsets.only(bottom: 6),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('•  ', style: TextStyle(fontWeight: FontWeight.w900)),
                              Expanded(child: Text(w)),
                            ],
                          ),
                        ),
                      ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 10),
        ],
        Text(
          'Quick templates (tap to insert)',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 6),
        Text(
          'These add starter sentences you can edit. They won’t erase what you’ve written.',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
                fontWeight: FontWeight.w600,
              ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            ActionChip(
              label: const Text('Specific + measurable'),
              onPressed: () => _insertApplicationTemplate('specific'),
            ),
            ActionChip(
              label: const Text('Relationship step'),
              onPressed: () => _insertApplicationTemplate('relationship'),
            ),
            ActionChip(
              label: const Text('Habit plan'),
              onPressed: () => _insertApplicationTemplate('habit'),
            ),
            ActionChip(
              label: const Text('Prayer response'),
              onPressed: () => _insertApplicationTemplate('prayer'),
            ),
          ],
        ),
      ],
    );
  }

  Widget _checkChip(String label, bool ok) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: scheme.outlineVariant),
        color: ok ? scheme.primaryContainer.withOpacity(0.6) : scheme.surfaceVariant.withOpacity(0.25),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(ok ? Icons.check_circle_outline : Icons.radio_button_unchecked, size: 18),
          const SizedBox(width: 6),
          Text(label, style: const TextStyle(fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }

  // ------------------------------------------------------------
  // Context + Observation helpers
  // ------------------------------------------------------------

  List<String> _contextChecklist() {
    switch (_genre) {
      case 'Epistle':
        return const [
          'Who wrote it? What relationship do they have?',
          'Who received it? What situation are they in?',
          'Why was it written (occasion/problem)?',
          'Key themes repeated in the letter.',
          'What “therefore” is pointing back to.',
          'What the audience assumes from OT/covenant.',
        ];
      case 'Narrative':
      case 'Gospel':
        return const [
          'Where/when is this happening in the story?',
          'Who is speaking? Who is listening?',
          'What cultural/religious practice is assumed?',
          'What happened right before this scene?',
          'Why is this moment included?',
          'What would shock/comfort the first audience?',
        ];
      case 'Poetry/Wisdom':
        return const [
          'What life setting (lament/praise/wisdom)?',
          'What emotion/tone is driving the words?',
          'What ancient imagery is used (shepherd, courts, fields)?',
          'What contrasts are emphasized?',
          'What covenant assumptions exist?',
          'How would Israel hear this language?',
        ];
      case 'Law':
        return const [
          'Who is addressed (Israel/priests/people)?',
          'Where are they in the story (Sinai/wilderness)?',
          'What does this protect/teach about holiness?',
          'Scope/conditions (when/where/for whom).',
          'What covenant terms repeat?',
          'How would this shape community life?',
        ];
      case 'Prophecy':
        return const [
          'Which people/nation is addressed?',
          'What covenant problem is confronted?',
          'Warnings, promises, or both?',
          'Historical crisis in the background?',
          'Repeated images and what they evoke.',
          'Near-term vs longer-term horizon?',
        ];
      case 'Apocalyptic':
        return const [
          'Who is suffering/under pressure?',
          'What powers/oppression might be implied?',
          'Repeated symbols/numbers?',
          'Big contrasts (true/false worship)?',
          'What hope is offered to endure?',
          'How would first readers hear this imagery?',
        ];
      default:
        return const [
          'Who wrote it? Who heard it first?',
          'What’s happening historically/culturally?',
          'Why was it written/spoken?',
          'Any repeated themes or key terms?',
          'Any OT/covenant background assumed?',
          'What would “land” emotionally for them?',
        ];
    }
  }

  String _genreObservationHint() {
    switch (_genre) {
      case 'Poetry/Wisdom':
        return 'Write observations about imagery/parallelism/contrasts. Avoid jumping to meaning yet.';
      case 'Epistle':
        return 'Track the author’s logic: claims → reasons → implications (“therefore”).';
      case 'Narrative':
        return 'Track who/what/where, and what changes in the story.';
      case 'Law':
        return 'Note who is addressed, what is required, and any conditions (“if”).';
      case 'Prophecy':
        return 'Note warnings/promises and repeated images; watch for “return/repent” language.';
      case 'Apocalyptic':
        return 'Note repeated symbols/images and what contrast they create.';
      case 'Gospel':
        return 'Note Jesus’ actions/words and repeated themes; how do people respond?';
      default:
        return 'Write text-based observations. Use chips if you’re not sure where to start.';
    }
  }

  List<MapEntry<String, int>> _repeatedWordsTop({int max = 10}) {
    final text = _passageTextCtrl.text
        .toLowerCase()
        .replaceAll(RegExp(r'[^a-z0-9\s]'), ' ')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();

    if (text.isEmpty) return const [];

    final words = text.split(' ').where((w) {
      final t = w.trim();
      if (t.isEmpty) return false;
      if (t.length <= 2) return false;
      if (_stop.contains(t)) return false;
      if (RegExp(r'^\d+$').hasMatch(t)) return false;
      return true;
    });

    final counts = <String, int>{};
    for (final w in words) {
      counts[w] = (counts[w] ?? 0) + 1;
    }

    final entries = counts.entries.where((e) => e.value >= 2).toList()
      ..sort((a, b) {
        final c = b.value.compareTo(a.value);
        if (c != 0) return c;
        return a.key.compareTo(b.key);
      });

    return entries.take(max).toList();
  }

  int _obsCategoryScore() {
    final t = _obsCtrl.text.toLowerCase();
    bool hasAny(List<String> keys) => keys.any((k) => t.contains(k));

    int score = 0;
    if (hasAny(['repeated', 'repeat', 'repeats', 'repeated word'])) score++;
    if (hasAny(['command', 'imperative', 'do not', 'don’t', 'let us', 'must'])) score++;
    if (hasAny(['contrast', 'but', 'however', 'yet', 'instead', 'rather'])) score++;
    if (hasAny(['because', 'so that', 'therefore', 'result', 'leads to', 'causes'])) score++;
    if (hasAny(['people', 'group', 'audience', 'disciples', 'pharisees', 'jesus'])) score++;
    if (hasAny(['structure', 'flow', 'moves', 'first', 'second', 'finally', 'then'])) score++;

    return score.clamp(0, 6);
  }

  List<String> _missingObsSuggestions() {
    final t = _obsCtrl.text.toLowerCase();
    final missing = <String>[];
    bool hasAny(List<String> keys) => keys.any((k) => t.contains(k));

    if (!hasAny(['repeated', 'repeat', 'repeats', 'repeated word'])) missing.add('Try noting repeated words');
    if (!hasAny(['command', 'imperative', 'do not', 'don’t', 'let us', 'must'])) missing.add('Look for a command');
    if (!hasAny(['contrast', 'but', 'however', 'yet', 'instead', 'rather'])) missing.add('Find a contrast (“but/however”)');
    if (!hasAny(['because', 'so that', 'therefore', 'result', 'leads to', 'causes'])) missing.add('Mark cause/effect (“because/therefore”)');
    if (!hasAny(['people', 'group', 'audience', 'disciples', 'pharisees', 'jesus'])) missing.add('List key people/groups');
    if (!hasAny(['structure', 'flow', 'moves', 'first', 'second', 'finally', 'then'])) missing.add('Outline the flow/structure');

    return missing.take(2).toList();
  }

  Widget _observationTrainingPanel() {
    final score = _obsCategoryScore();
    final missing = _missingObsSuggestions();
    final repeated = _repeatedWordsTop(max: 10);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Observation training',
          style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 6),
        Row(
          children: [
            Expanded(
              child: LinearProgressIndicator(
                value: score / 6.0,
                minHeight: 8,
                borderRadius: BorderRadius.circular(999),
              ),
            ),
            const SizedBox(width: 10),
            Text('$score/6', style: const TextStyle(fontWeight: FontWeight.w900)),
          ],
        ),
        const SizedBox(height: 8),
        if (missing.isNotEmpty)
          Text(
            missing.join(' • '),
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
          ),
        if (_passageTextCtrl.text.trim().isNotEmpty) ...[
          const SizedBox(height: 12),
          Text(
            'Repeated words',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 8),
          if (repeated.isEmpty)
            Text(
              'No repeats found (or passage is very short).',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            )
          else
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final e in repeated)
                  ActionChip(
                    label: Text('${e.key} (${e.value}x)'),
                    onPressed: () => _insertInto(_obsCtrl, '• Repeated word: "${e.key}" (${e.value}x)'),
                  ),
              ],
            ),
        ],
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            ActionChip(
              label: const Text('Repeated words'),
              onPressed: () => _insertInto(_obsCtrl, '• Repeated words/phrases: ___'),
            ),
            ActionChip(
              label: const Text('Key people'),
              onPressed: () => _insertInto(_obsCtrl, '• People/groups mentioned: ___'),
            ),
            ActionChip(
              label: const Text('Commands'),
              onPressed: () => _insertInto(_obsCtrl, '• Commands (imperatives): ___'),
            ),
            ActionChip(
              label: const Text('Contrasts'),
              onPressed: () => _insertInto(_obsCtrl, '• Contrasts (“but/however”): ___'),
            ),
            ActionChip(
              label: const Text('Cause → effect'),
              onPressed: () => _insertInto(_obsCtrl, '• Cause → effect (“because/therefore/so that”): ___'),
            ),
            ActionChip(
              label: const Text('Structure'),
              onPressed: () => _insertInto(_obsCtrl, '• Flow/structure (A → B → C): ___'),
            ),
          ],
        ),
      ],
    );
  }

  // ------------------------------------------------------------
  // UI building blocks
  // ------------------------------------------------------------

  String _trackSummary() {
    switch (_track) {
      case StudyTrack.beginner:
        return 'Simple + practical';
      case StudyTrack.intermediate:
        return 'Adds context';
      case StudyTrack.advanced:
        return 'Deep dive';
    }
  }

  Widget _passageQuickActionsRow() {
    final scheme = Theme.of(context).colorScheme;
    final hasRef = _passageRefCtrl.text.trim().isNotEmpty;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            FilledButton.icon(
              onPressed: hasRef && !_fetchingNet ? () => _fetchNetPassageText() : null,
              icon: _fetchingNet
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.download_outlined),
              label: const Text('Fetch NET text'),
            ),
            OutlinedButton.icon(
              onPressed: hasRef ? _openNetPlainInBrowser : null,
              icon: const Icon(Icons.open_in_new),
              label: const Text('Open NET (text)'),
            ),
            OutlinedButton.icon(
              onPressed: _openStepBible,
              icon: const Icon(Icons.call_split_outlined),
              label: const Text('Open StepBible'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Text(
          'Tip: “Fetch NET text” fills the optional Passage Text box so Observation can suggest repeated words.',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: scheme.onSurfaceVariant,
                fontWeight: FontWeight.w700,
              ),
        ),
        if (_lastNetFetchError != null) ...[
          const SizedBox(height: 8),
          Text(
            'Last fetch error: $_lastNetFetchError',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: scheme.error,
                  fontWeight: FontWeight.w700,
                ),
          ),
        ],
      ],
    );
  }

  Widget _heroHeader() {
    final scheme = Theme.of(context).colorScheme;

    return FadeSlideIn(
      delay: const Duration(milliseconds: 0),
      dy: 8,
      child: HeroHeader(
      title: 'Study Session',
      subtitle: 'Work the prompts in order — you can keep cards collapsed until you need them.',
      trailing: Icon(Icons.auto_stories_outlined, color: scheme.primary),
      badges: [
        HeroBadge(icon: Icons.tune, label: 'Track', value: _track.label),
        HeroBadge(icon: Icons.auto_awesome, label: 'Mode', value: _trackSummary()),
        HeroBadge(icon: Icons.category_outlined, label: 'Genre', value: _genre == 'Unknown' ? 'General' : _genre),
      ],
      bottom: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              const Icon(Icons.calendar_today_outlined, size: 18),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  '${_date.month}/${_date.day}/${_date.year}',
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
              ),
              OutlinedButton.icon(
                onPressed: _pickDate,
                icon: const Icon(Icons.edit_calendar),
                label: const Text('Change'),
              ),
              const SizedBox(width: 10),
              if (_saving)
                const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)),
            ],
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _passageRefCtrl,
            textInputAction: TextInputAction.next,
            decoration: const InputDecoration(
              labelText: 'Passage reference',
              hintText: 'e.g., John 1:1–18',
            ),
          ),
          const SizedBox(height: 12),
          _passageQuickActionsRow(),
          const SizedBox(height: 14),
          Text(
            'Choose your track',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 10),
          SegmentedButton<StudyTrack>(
            segments: const [
              ButtonSegment(value: StudyTrack.beginner, label: Text('Beginner', maxLines: 1, overflow: TextOverflow.ellipsis, softWrap: false)),
              ButtonSegment(value: StudyTrack.intermediate, label: Text('Intermediate', maxLines: 1, overflow: TextOverflow.ellipsis, softWrap: false)),
              ButtonSegment(value: StudyTrack.advanced, label: Text('Advanced', maxLines: 1, overflow: TextOverflow.ellipsis, softWrap: false)),
            ],
            selected: {_track},
            onSelectionChanged: (set) {
              final next = set.first;
              setState(() {
                _track = next;
                _dirty = true;
              });
              _saveDebounce?.cancel();
              _saveDebounce = Timer(const Duration(milliseconds: 200), () {
                if (!mounted) return;
                _saveIfNeeded(showSnack: false);
              });
            },
          ),
        ],
      ),
      ),
    );
  }

  // ------------------------------------------------------------
  // Genre / Passage Text / Context
  // ------------------------------------------------------------

  Widget _genreSelectorCard() {
    final open = _open['genre'] ?? false;

    const genres = <String>[
      'Unknown',
      'Narrative',
      'Gospel',
      'Poetry/Wisdom',
      'Law',
      'Epistle',
      'Prophecy',
      'Apocalyptic',
    ];

    return Card(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 14, 14, 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _cardHeader(
              keyName: 'genre',
              icon: Icons.auto_stories_outlined,
              title: 'Genre lens',
              open: open,
              onToggle: () => setState(() => _open['genre'] = !open),
              toolsTitle: 'Tools for Genre',
            ),
            const SizedBox(height: 6),
            Text('Genre shapes what to look for.', style: Theme.of(context).textTheme.bodyMedium),
            _toolsHintLine(),
            AnimatedCrossFade(
              firstChild: const SizedBox(height: 0),
              secondChild: Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final g in genres)
                      ChoiceChip(
                        label: Text(g),
                        selected: _genre == g,
                        onSelected: (_) {
                          setState(() {
                            _genre = g;
                            _dirty = true;
                          });
                          _saveDebounce?.cancel();
                          _saveDebounce = Timer(const Duration(milliseconds: 200), () {
                            if (!mounted) return;
                            _saveIfNeeded(showSnack: false);
                          });
                        },
                      ),
                  ],
                ),
              ),
              crossFadeState: open ? CrossFadeState.showSecond : CrossFadeState.showFirst,
              duration: const Duration(milliseconds: 200),
            ),
          ],
        ),
      ),
    );
  }

  Widget _passageTextCard() {
    final open = _open['passageText'] ?? false;

    return Card(
      key: _passageTextCardKey,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 14, 14, 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _cardHeader(
              keyName: 'passageText',
              icon: Icons.format_quote_outlined,
              title: 'Paste passage text (optional)',
              open: open,
              onToggle: () => setState(() => _open['passageText'] = !open),
              toolsTitle: 'Tools for Passage Text',
            ),
            const SizedBox(height: 6),
            Text('This enables repeated-word suggestions for Observation.', style: Theme.of(context).textTheme.bodyMedium),
            _toolsHintLine(),
            AnimatedCrossFade(
              firstChild: const SizedBox(height: 0),
              secondChild: Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (_passageRefCtrl.text.trim().isNotEmpty) ...[
                      Wrap(
                        spacing: 10,
                        runSpacing: 10,
                        children: [
                          OutlinedButton.icon(
                            onPressed: _fetchingNet ? null : () => _fetchNetPassageText(overwrite: true),
                            icon: const Icon(Icons.download_outlined),
                            label: const Text('Replace with NET text'),
                          ),
                          OutlinedButton.icon(
                            onPressed: _openNetPlainInBrowser,
                            icon: const Icon(Icons.open_in_new),
                            label: const Text('Open NET (text)'),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                    ],
                    TextField(
                      controller: _passageTextCtrl,
                      minLines: 6,
                      maxLines: 18,
                      textInputAction: TextInputAction.newline,
                      decoration: const InputDecoration(
                        hintText: 'Paste the verses here… (optional)',
                      ),
                    ),
                    // ✅ NEW: detect refs from pasted passage text too (people sometimes paste refs in here)
                    _detectedRefsRow(_passageTextCtrl.text, insertTarget: _notesVisibleCtrl),
                  ],
                ),
              ),
              crossFadeState: open ? CrossFadeState.showSecond : CrossFadeState.showFirst,
              duration: const Duration(milliseconds: 200),
            ),
          ],
        ),
      ),
    );
  }

  Widget _contextBuilderCard() {
    final open = _open['context'] ?? false;
    final checklist = _contextChecklist();

    return Card(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 14, 14, 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _cardHeader(
              keyName: 'context',
              icon: Icons.public_outlined,
              title: 'Historical / cultural context (Intermediate)',
              open: open,
              onToggle: () => setState(() => _open['context'] = !open),
              toolsTitle: 'Tools for Context',
            ),
            const SizedBox(height: 6),
            Text(
              'Answer “Who/why/what was happening?” so application stays accurate.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            _toolsHintLine(),
            AnimatedCrossFade(
              firstChild: const SizedBox(height: 0),
              secondChild: Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Card(
                      margin: EdgeInsets.zero,
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Quick checklist (${_genre == 'Unknown' ? 'General' : _genre})',
                              style: const TextStyle(fontWeight: FontWeight.w900),
                            ),
                            const SizedBox(height: 8),
                            ...checklist.take(3).map(
                                  (b) => Padding(
                                    padding: const EdgeInsets.only(bottom: 6),
                                    child: Row(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const Text('•  ', style: TextStyle(fontWeight: FontWeight.w900)),
                                        Expanded(child: Text(b)),
                                      ],
                                    ),
                                  ),
                                ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      'Templates (adds starter lines and opens the matching card below)',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        ActionChip(
                          label: const Text('Insert audience template'),
                          onPressed: () {
                            setState(() => _open['aud'] = true);
                            _insertInto(_audCtrl, 'Audience: ___');
                            _insertInto(_audCtrl, 'Situation/pressure: ___');
                            _insertInto(_audCtrl, 'Relevant cultural/historical background: ___');
                            if (mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Added starter lines to “Original audience”.')),
                              );
                            }
                          },
                        ),
                        ActionChip(
                          label: const Text('Insert meaning template'),
                          onPressed: () {
                            setState(() => _open['mean'] = true);
                            _insertInto(_meanCtrl, 'Meaning to them (in their situation): ___');
                            _insertInto(_meanCtrl, 'Why this mattered to them: ___');
                            _insertInto(_meanCtrl, 'Key assumption they would already understand: ___');
                            if (mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Added starter lines to “What did it mean to them?”.')),
                              );
                            }
                          },
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              crossFadeState: open ? CrossFadeState.showSecond : CrossFadeState.showFirst,
              duration: const Duration(milliseconds: 200),
            ),
          ],
        ),
      ),
    );
  }

  // ------------------------------------------------------------
  // ✅ _sectionCard: now shows detected refs when open
  // ------------------------------------------------------------

  Widget _sectionCard({
    required String keyName,
    required IconData icon,
    required String title,
    required String helper,
    required TextEditingController controller,
    required String hint,
    int minLines = 4,
    Widget? trainingPanelWhenOpen,
  }) {
    final open = _open[keyName] ?? false;
    final scheme = Theme.of(context).colorScheme;
    Color accent;
    switch (keyName) {
      case 'sim':
      case 'diff':
        accent = scheme.secondary;
        break;
      case 'app':
        accent = scheme.tertiary;
        break;
      case 'notes':
        accent = scheme.secondary;
        break;
      default:
        accent = scheme.primary;
    }

    return Card(
      elevation: open ? 2 : 0,
      shadowColor: scheme.shadow.withOpacity(open ? 0.18 : 0.0),
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(color: scheme.outlineVariant.withOpacity(0.55)),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 14, 14, 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _cardHeader(
              keyName: keyName,
              icon: icon,
              title: title,
              open: open,
              onToggle: () => setState(() => _open[keyName] = !open),
              toolsTitle: 'Tools for ${title.replaceAll(RegExp(r'^\d+\)\s*'), '').replaceAll(RegExp(r'^[A-E]\)\s*'), '')}',
              showToolsButton: true,
            ),
            const SizedBox(height: 6),
            Text(helper, style: Theme.of(context).textTheme.bodyMedium),
            _toolsHintLine(),
            AnimatedCrossFade(
              firstChild: const SizedBox(height: 0),
              secondChild: Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (trainingPanelWhenOpen != null) ...[
                      trainingPanelWhenOpen,
                      const SizedBox(height: 12),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 2),
                        child: Row(
                          children: [
                            Expanded(
                              child: Container(
                                height: 6,
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(999),
                                  color: accent.withOpacity(0.22),
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Container(
                              width: 10,
                              height: 10,
                              decoration: BoxDecoration(
                                color: accent.withOpacity(0.35),
                                shape: BoxShape.circle,
                                border: Border.all(color: scheme.outlineVariant.withOpacity(0.45)),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                    ],
                    TextField(
                      controller: controller,
                      minLines: minLines,
                      maxLines: 14,
                      textInputAction: TextInputAction.newline,
                      decoration: InputDecoration(hintText: hint),
                    ),

                    // ✅ NEW: auto-detect refs inside this field
                    _detectedRefsRow(controller.text, insertTarget: _notesVisibleCtrl),
                  ],
                ),
              ),
              crossFadeState: open ? CrossFadeState.showSecond : CrossFadeState.showFirst,
              duration: const Duration(milliseconds: 200),
            ),
          ],
        ),
      ),
    );
  }

  Widget _advancedHeader() {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Icon(Icons.school_outlined, color: scheme.primary),
            const SizedBox(width: 10),
            const Expanded(
              child: Text(
                'Advanced prompts',
                style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(999),
                border: Border.all(color: scheme.outlineVariant),
                color: scheme.primaryContainer.withOpacity(0.45),
              ),
              child: const Text('Advanced', style: TextStyle(fontWeight: FontWeight.w900)),
            ),
          ],
        ),
      ),
    );
  }

  
  // ------------------------------------------------------------
  // ✅ Copy that auto-shifts by Track (no manual toggles)
  // ------------------------------------------------------------

  String _copyObsTitle() {
    switch (_track) {
      case StudyTrack.beginner:
        return '1) What do you notice?';
      case StudyTrack.intermediate:
        return '1) Important words / observations';
      case StudyTrack.advanced:
        return '1) Observations (imperatives / flow)';
    }
  }

  String _copyObsHelper() {
    switch (_track) {
      case StudyTrack.beginner:
        return 'Slow down and list what you see in the text (repeated words, people, actions, “because/therefore”, contrasts).';
      case StudyTrack.intermediate:
        return 'Observation = what the text says. Start with repeated words, people, contrasts, cause/effect.';
      case StudyTrack.advanced:
        return 'Stay text-first. Mark imperatives, discourse flow (claims → reasons → implications), contrasts, and repeated terms.';
    }
  }

  String _copyObsHint() {
    // Keep genre-specific hints, but soften/tighten based on track.
    final base = _genreObservationHint();
    switch (_track) {
      case StudyTrack.beginner:
        return '$base\n\nStarter: “I notice ___.”';
      case StudyTrack.intermediate:
        return base;
      case StudyTrack.advanced:
        return '$base\n\nAlso note: imperatives, conjunctions (“therefore/because”), and argument structure.';
    }
  }

  String _copyAppHelper() {
    switch (_track) {
      case StudyTrack.beginner:
        return 'Write one clear response that you can actually do this week. Keep it simple and honest.';
      case StudyTrack.intermediate:
        return 'Write a specific response that is faithful to the text and wise for today.';
      case StudyTrack.advanced:
        return 'State a text-grounded obedience response (motive + measurable step + timeframe). Keep it God-centered.';
    }
  }

  String _copyAppHint() {
    switch (_track) {
      case StudyTrack.beginner:
        return 'Example: “This week I will ___ because ___ … by ___.”';
      case StudyTrack.intermediate:
        return 'Example: “This week I will ___ because ___ … by ___.”';
      case StudyTrack.advanced:
        return 'Example: “Therefore, I will ___ because ___ (tied to the text), by ___, so that ___.”';
    }
  }

  // ------------------------------------------------------------
  // ✅ Win Moment (end-of-session completion)
  // ------------------------------------------------------------

  String _firstMeaningfulLine(String raw) {
    for (final line in raw.split('\n')) {
      final s = line.trim();
      if (s.isEmpty) continue;
      return s.replaceFirst(RegExp(r'^[•\-\*]\s*'), '').trim();
    }
    return '';
  }

  Future<void> _showWinMoment() async {
    final scheme = Theme.of(context).colorScheme;

    final obs = _firstMeaningfulLine(_obsCtrl.text);
    final app = _firstMeaningfulLine(_appCtrl.text);

    final obsLine = obs.isEmpty ? '— (No observation captured yet)' : obs;
    final appLine = app.isEmpty ? '— (No application written yet)' : app;

    await showDialog<void>(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: const Text('Session complete'),
          content: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Faithful study is slow and patient. Well done.',
                  style: Theme.of(ctx).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 14),
                Card(
                  margin: EdgeInsets.zero,
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('1 key observation', style: TextStyle(fontWeight: FontWeight.w900)),
                        const SizedBox(height: 6),
                        Text(obsLine, style: Theme.of(ctx).textTheme.bodyMedium),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                Card(
                  margin: EdgeInsets.zero,
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('1 application step', style: TextStyle(fontWeight: FontWeight.w900)),
                        const SizedBox(height: 6),
                        Text(appLine, style: Theme.of(ctx).textTheme.bodyMedium),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'Optional prayer',
                  style: Theme.of(ctx).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 6),
                Text(
                  '“Lord, help me believe and obey what You showed me today. Give me strength to follow through, and love to walk it out with humility. Amen.”',
                  style: Theme.of(ctx).textTheme.bodyMedium?.copyWith(height: 1.35, color: scheme.onSurface),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () async {
                final text = 'Observation: $obsLine\nApplication: $appLine';
                await Clipboard.setData(ClipboardData(text: text));
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Highlights copied')),
                  );
                }
              },
              child: const Text('Copy highlights'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Done!'),
            ),
          ],
        );
      },
    );
  }

// ------------------------------------------------------------
  // Build
  // ------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    final canPop = Navigator.canPop(context);
    final scheme = Theme.of(context).colorScheme;

    return WillPopScope(
      onWillPop: () async {
        await _saveIfNeeded(showSnack: false);
        return true;
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Study Session'),
          leading: canPop ? const BackButton() : null,
          actions: [
            IconButton(
              tooltip: 'Save',
              onPressed: () => _saveIfNeeded(showSnack: true, force: true),
              icon: const Icon(Icons.save_outlined),
            ),
          ],
        ),
        body: Stack(
          children: [
            // Background depth (visual only)
            Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      scheme.surface,
                      scheme.surfaceVariant.withOpacity(
                        scheme.brightness == Brightness.dark ? 0.10 : 0.16,
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // Subtle “dark mode drama” blobs (ignore pointer)
            Positioned(
              top: scheme.brightness == Brightness.dark ? -140 : -110,
              right: scheme.brightness == Brightness.dark ? -140 : -110,
              child: IgnorePointer(
                ignoring: true,
                child: Container(
                  width: scheme.brightness == Brightness.dark ? 420 : 330,
                  height: scheme.brightness == Brightness.dark ? 420 : 330,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [
                        scheme.primary.withOpacity(
                          scheme.brightness == Brightness.dark ? 0.20 : 0.10,
                        ),
                        scheme.primary.withOpacity(0.0),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            Positioned(
              top: scheme.brightness == Brightness.dark ? 120 : 140,
              left: scheme.brightness == Brightness.dark ? -170 : -140,
              child: IgnorePointer(
                ignoring: true,
                child: Container(
                  width: scheme.brightness == Brightness.dark ? 480 : 380,
                  height: scheme.brightness == Brightness.dark ? 480 : 380,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [
                        scheme.tertiary.withOpacity(
                          scheme.brightness == Brightness.dark ? 0.16 : 0.08,
                        ),
                        scheme.tertiary.withOpacity(0.0),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            Positioned(
              bottom: scheme.brightness == Brightness.dark ? -210 : -160,
              right: scheme.brightness == Brightness.dark ? -190 : -140,
              child: IgnorePointer(
                ignoring: true,
                child: Container(
                  width: scheme.brightness == Brightness.dark ? 520 : 410,
                  height: scheme.brightness == Brightness.dark ? 520 : 410,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [
                        scheme.secondary.withOpacity(
                          scheme.brightness == Brightness.dark ? 0.14 : 0.07,
                        ),
                        scheme.secondary.withOpacity(0.0),
                      ],
                    ),
                  ),
                ),
              ),
            ),

            _loading
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                controller: _scroll,
                padding: const EdgeInsets.fromLTRB(12, 12, 12, 24),
                children: [
                  _heroHeader(),
                  const SizedBox(height: 12),

                  _prayerCard(),
                  const SizedBox(height: 14),

                  const SectionHeader(
                    icon: Icons.tune,
                    title: 'Setup',
                    subtitle: 'Resources, genre, and optional passage text.',
                  ),

                  _resourcesCard(),
                  const SizedBox(height: 12),

                  _genreSelectorCard(),
                  const SizedBox(height: 12),

                  _passageTextCard(),
                  const SizedBox(height: 12),

                  if (_showIntermediate) ...[
                    _contextBuilderCard(),
                    const SizedBox(height: 12),
                  ],

                  const SizedBox(height: 2),
                  const SectionHeader(
                    icon: Icons.checklist_outlined,
                    title: 'Guided study prompts',
                    subtitle: 'Work top to bottom. Keep it text-based before interpreting.',
                  ),

                  _sectionCard(
                    keyName: 'obs',
                    icon: Icons.search,
                    title: _copyObsTitle(),
                    helper: _copyObsHelper(),
                    controller: _obsCtrl,
                    hint: _copyObsHint(),
                    trainingPanelWhenOpen: _observationTrainingPanel(),
                    minLines: 6,
                  ),

                  if (_showIntermediate) ...[
                    _sectionCard(
                      keyName: 'aud',
                      icon: Icons.group_outlined,
                      title: '2) Original audience',
                      helper: 'Who heard/read this first? What was their situation?',
                      controller: _audCtrl,
                      hint: 'Audience, setting, pressures, cultural background…',
                    ),
                    _sectionCard(
                      keyName: 'mean',
                      icon: Icons.history_edu_outlined,
                      title: '3) What did it mean to them?',
                      helper: 'What would the original audience understand this to mean in THEIR world?',
                      controller: _meanCtrl,
                      hint: 'Meaning to them, why it mattered, assumptions they already had…',
                    ),
                    _sectionCard(
                      keyName: 'sim',
                      icon: Icons.compare_arrows,
                      title: '4) How is our context similar?',
                      helper: 'Bridge: what overlaps between their world and ours?',
                      controller: _simCtrl,
                      hint: 'Similarities (faith, struggles, community, temptations)…',
                    ),
                    _sectionCard(
                      keyName: 'diff',
                      icon: Icons.public_outlined,
                      title: '5) How is our context different?',
                      helper: 'Guardrail: name differences so you don’t misapply.',
                      controller: _diffCtrl,
                      hint: 'Differences (covenant, culture, setting, audience)…',
                    ),
                  ],

                  _sectionCard(
                    keyName: 'app',
                    icon: Icons.check_circle_outline,
                    title: _showIntermediate ? '6) Application / response' : '2) Application / response',
                    helper: _copyAppHelper(),
                    controller: _appCtrl,
                    hint: _copyAppHint(),
                    trainingPanelWhenOpen: _applicationGuardrailsPanel(),
                    minLines: 6,
                  ),

                  if (_showAdvanced) ...[
                    const SizedBox(height: 14),
                    const SectionHeader(
                      icon: Icons.school_outlined,
                      title: 'Advanced study',
                      subtitle: 'Optional deep-dive prompts for structure, themes, and cross-references.',
                    ),
                    _advancedHeader(),
                    const SizedBox(height: 12),

                    _sectionCard(
                      keyName: 'advStructure',
                      icon: Icons.account_tree_outlined,
                      title: 'A) Structure / argument flow',
                      helper: 'Outline the logic or movement of the passage (claims → reasons → implications).',
                      controller: _advStructureCtrl,
                      hint: 'Example: vv1–2 claim, vv3–5 reasons, vv6–8 application…',
                      minLines: 6,
                    ),
                    _sectionCard(
                      keyName: 'advThemes',
                      icon: Icons.lightbulb_outline,
                      title: 'B) Big theological themes',
                      helper: 'What truths about God, humanity, salvation, covenant, kingdom, holiness, etc. show up here?',
                      controller: _advThemesCtrl,
                      hint: 'List 2–5 themes and point to the verse(s) that show them.',
                      minLines: 6,
                    ),
                    _sectionCard(
                      keyName: 'advCrossRefs',
                      icon: Icons.call_split_outlined,
                      title: 'C) Cross references / intertext',
                      helper: 'Where does Scripture interpret Scripture? Note OT echoes, quotations, or parallel passages.',
                      controller: _advCrossRefsCtrl,
                      hint: 'Write references and what connection you see (theme/phrase/concept).',
                      minLines: 6,
                    ),
                    _sectionCard(
                      keyName: 'advWordStudy',
                      icon: Icons.translate_outlined,
                      title: 'D) Word study (key terms)',
                      helper: 'Choose 1–3 key words. Define them from context, then check lexicon/interlinear.',
                      controller: _advWordStudyCtrl,
                      hint: 'Word → meaning in context → other uses → how it impacts interpretation.',
                      minLines: 6,
                    ),
                    _sectionCard(
                      keyName: 'advCommentary',
                      icon: Icons.menu_book_outlined,
                      title: 'E) Commentary / questions to resolve',
                      helper: 'Summarize what you found from a trusted resource and list any remaining questions.',
                      controller: _advCommentaryCtrl,
                      hint: 'What did you learn? What are 1–3 questions you still need to resolve?',
                      minLines: 6,
                    ),
                  ],

                  const SizedBox(height: 14),
                  const SectionHeader(
                    icon: Icons.edit_note,
                    title: 'Notes',
                    subtitle: 'Capture extra insights, questions, and prayer notes.',
                  ),

                  _sectionCard(
                    keyName: 'notes',
                    icon: Icons.edit_note,
                    title: 'Additional notes (optional)',
                    helper: 'Extra notes, cross references, prayer notes, questions…',
                    controller: _notesVisibleCtrl,
                    hint: 'Write anything helpful here…',
                    minLines: 6,
                  ),

                  const SizedBox(height: 14),
                  FilledButton.icon(
                    onPressed: () async {
                      await _saveIfNeeded(showSnack: true, force: true);
                      if (!mounted) return;
                      await _showWinMoment();
                      if (mounted) Navigator.pop(context, true);
                    },
                    icon: const Icon(Icons.check),
                    label: const Text('Done'),
                  ),
                ],
              )
          ],
        ),
      ),
    );
  }
}