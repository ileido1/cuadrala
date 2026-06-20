import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/di/service_locator.dart';
import '../../../core/formatting/money_format.dart';
import '../../../core/models/currency_code.dart';
import '../../../core/theme/app_icons.dart';
import '../data/monetization_repository.dart';
import 'waiting_confirmation_screen.dart';

final class UploadReceiptScreen extends StatefulWidget {
  const UploadReceiptScreen({
    super.key,
    required this.matchId,
    required this.transactionId,
    required this.method,
    required this.amountPerPersonCents,
    required this.matchTitle,
    this.pricingCurrency,
    this.venueId,
  });

  final String matchId;
  final String transactionId;
  final String method;
  final int amountPerPersonCents;
  final String matchTitle;
  final String? pricingCurrency;
  final String? venueId;

  static String route({
    required String matchId,
    required String transactionId,
    required String method,
    required int amountPerPersonCents,
    required String matchTitle,
    String? pricingCurrency,
    String? venueId,
  }) {
    final qp = <String, String>{
      'tx': transactionId,
      'method': method,
      'amountCents': amountPerPersonCents.toString(),
      'title': matchTitle,
      'currency': ?pricingCurrency,
      if (venueId != null && venueId.isNotEmpty) 'venueId': venueId,
    };
    final query = Uri(queryParameters: qp).query;
    return '/matches/$matchId/pay/upload-receipt?$query';
  }

  @override
  State<UploadReceiptScreen> createState() => _UploadReceiptScreenState();
}

class _UploadReceiptScreenState extends State<UploadReceiptScreen> {
  bool _uploading = false;
  Uint8List? _imageBytes;
  String _fileName = 'receipt.jpg';

  Future<void> _pick() async {
    final picker = ImagePicker();
    final xfile = await picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 2048,
      imageQuality: 85,
    );
    if (xfile == null) return;
    final bytes = await xfile.readAsBytes();
    final name = xfile.name.trim();
    if (!mounted) return;
    setState(() {
      _imageBytes = bytes;
      _fileName = name.isNotEmpty ? name : 'receipt.jpg';
    });
  }

  Future<void> _upload() async {
    final bytes = _imageBytes;
    if (bytes == null) return;

    setState(() => _uploading = true);
    try {
      await getIt<MonetizationRepository>().uploadReceipt(
        transactionId: widget.transactionId,
        fileBytes: bytes,
        fileName: _fileName,
      );
      if (!mounted) return;
      context.go(
        WaitingConfirmationScreen.route(
          matchId: widget.matchId,
          amountPerPersonCents: widget.amountPerPersonCents,
          matchTitle: widget.matchTitle,
          pricingCurrency: widget.pricingCurrency,
          transactionId: widget.transactionId,
          venueId: widget.venueId,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No se pudo subir el comprobante.')),
      );
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final currency = CurrencyCode.resolve(pricingCurrency: widget.pricingCurrency);
    final amount = formatMoneyCents(widget.amountPerPersonCents, currency);

    return Scaffold(
      key: const Key('pay.upload.receipt.screen'),
      appBar: AppBar(title: const Text('Subir comprobante')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            'Sube una captura o foto del comprobante para que el organizador '
            'lo confirme.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: scheme.onSurfaceVariant,
                  fontWeight: FontWeight.w700,
                ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              color: scheme.surfaceContainerHighest,
            ),
            child: Row(
              children: [
                const Icon(AppIcons.receipt),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    '${widget.matchTitle} · $amount',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w900,
                        ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          InkWell(
            onTap: _uploading ? null : _pick,
            borderRadius: BorderRadius.circular(16),
            child: Container(
              height: 240,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: scheme.outlineVariant),
                color: scheme.surface,
              ),
              child: _imageBytes == null
                  ? Center(
                      child: Text(
                        'Toca para seleccionar una imagen',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w900,
                            ),
                      ),
                    )
                  : ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: Image.memory(
                        _imageBytes!,
                        fit: BoxFit.cover,
                        width: double.infinity,
                      ),
                    ),
            ),
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: _uploading || _imageBytes == null ? null : _upload,
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: _uploading
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Enviar comprobante'),
            ),
          ),
        ],
      ),
    );
  }
}
