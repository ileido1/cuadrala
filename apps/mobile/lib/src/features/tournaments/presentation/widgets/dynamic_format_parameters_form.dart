import 'package:flutter/material.dart';
import '../../../../core/theme/app_icons.dart';
import '../../data/models/format_parameter_field_def.dart';
import '../../../../shared/widgets/segmented_control.dart';

class DynamicFormatParametersForm extends StatelessWidget {
  final List<FormatParameterFieldDef> fields;
  final Map<String, Object?> values;
  final void Function(String key, Object? value) onChanged;

  const DynamicFormatParametersForm({
    super.key,
    required this.fields,
    required this.values,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    if (fields.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      children: fields.map((field) {
        return _buildFieldWidget(context, field);
      }).toList(),
    );
  }

  Widget _buildFieldWidget(
    BuildContext context,
    FormatParameterFieldDef field,
  ) {
    if (field is BooleanFieldDef) {
      final rawValue = values[field.key];
      final currentValue = rawValue is bool ? rawValue : null;
      return Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(field.label, style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 6),
            SegmentedControl<bool>(
              value: currentValue,
              onChanged: (value) => onChanged(field.key, value),
              options: const [
                SegmentedOption(value: true, label: 'Sí'),
                SegmentedOption(value: false, label: 'No'),
              ],
            ),
          ],
        ),
      );
    } else if (field is IntFieldDef) {
      final rawValue = values[field.key];
      final currentValue = rawValue is int ? rawValue : null;
      final displayValue = currentValue ?? field.min;
      return ListTile(
        title: Text(field.label),
        subtitle: field.required == true ? const Text('Requerido') : null,
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              icon: const Icon(AppIcons.remove),
              onPressed:
                  currentValue == null ||
                      field.min == null ||
                      currentValue > field.min!
                  ? () {
                      if (currentValue == null) return;
                      final newValue = currentValue - 1;
                      if (field.min == null || newValue >= field.min!) {
                        onChanged(field.key, newValue);
                      }
                    }
                  : null,
            ),
            SizedBox(
              width: 60,
              child: Center(child: Text(displayValue?.toString() ?? '—')),
            ),
            IconButton(
              icon: const Icon(AppIcons.add),
              onPressed:
                  field.max != null &&
                      (currentValue ?? displayValue) != null &&
                      (currentValue ?? displayValue)! >= field.max!
                  ? null
                  : () {
                      final newValue = (currentValue ?? displayValue ?? 0) + 1;
                      if (field.max == null || newValue <= field.max!) {
                        onChanged(field.key, newValue);
                      }
                    },
            ),
          ],
        ),
      );
    } else if (field is EnumFieldDef) {
      final rawValue = values[field.key];
      final currentValue = rawValue is String ? rawValue : null;
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                Text(
                  field.label,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                if (field.required == true)
                  const Text(' *', style: TextStyle(color: Colors.red)),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: SegmentedControl<String>(
              value: currentValue,
              onChanged: (value) => onChanged(field.key, value),
              options: [
                for (final option in field.options)
                  SegmentedOption(value: option.value, label: option.label),
              ],
            ),
          ),
          const SizedBox(height: 16),
        ],
      );
    }

    return const SizedBox.shrink();
  }
}
