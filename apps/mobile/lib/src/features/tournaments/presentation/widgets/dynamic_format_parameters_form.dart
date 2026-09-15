import 'package:flutter/material.dart';
import '../../../../core/theme/app_icons.dart';
import '../../data/models/format_parameter_field_def.dart';
import '../../../../shared/widgets/selectable_chip.dart';
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
      final currentValue = (values[field.key] as bool?) ?? field.defaultValue;
      return Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: SelectableChip(
          label: field.label,
          selected: currentValue,
          onTap: () => onChanged(field.key, !currentValue),
        ),
      );
    } else if (field is IntFieldDef) {
      final currentValue = (values[field.key] as int?) ?? field.defaultValue;
      return ListTile(
        title: Text(field.label),
        subtitle: field.required == true ? const Text('Requerido') : null,
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              icon: const Icon(AppIcons.remove),
              onPressed: () {
                final newValue = (currentValue - 1);
                if (field.min == null || newValue >= field.min!) {
                  onChanged(field.key, newValue);
                }
              },
            ),
            SizedBox(
              width: 60,
              child: Center(child: Text(currentValue.toString())),
            ),
            IconButton(
              icon: const Icon(AppIcons.add),
              onPressed: () {
                final newValue = (currentValue + 1);
                if (field.max == null || newValue <= field.max!) {
                  onChanged(field.key, newValue);
                }
              },
            ),
          ],
        ),
      );
    } else if (field is EnumFieldDef) {
      final currentValue = (values[field.key] as String?);
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
