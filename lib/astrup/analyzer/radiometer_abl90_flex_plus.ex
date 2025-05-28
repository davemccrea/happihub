defmodule Astrup.Analyzer.RadiometerAbl90FlexPlus do
  @behaviour Astrup.Analyzer

  @impl Astrup.Analyzer
  def parameters() do
    [
      :ph,
      :pco2,
      :po2,
      :bicarbonate,
      :base_excess,
      :anion_gap,
      :hemoglobin,
      :oxygen_content,
      :oxygen_saturation,
      :carboxyhemoglobin,
      :methemoglobin,
      :potassium,
      :sodium,
      :ionized_calcium,
      :ionized_calcium_corrected_to_ph_7_4,
      :chloride,
      :glucose,
      :lactate
    ]
  end

  @impl Astrup.Analyzer
  def get_unit_by_parameter(parameter) do
    case parameter do
      :ph -> ""
      :pco2 -> "kPa"
      :po2 -> "kPa"
      :bicarbonate -> "mmol/L"
      :base_excess -> "mmol/L"
      :anion_gap -> "mmol/L"
      :hemoglobin -> "g/L"
      :oxygen_content -> "Vol%"
      :oxygen_saturation -> "%"
      :carboxyhemoglobin -> "%"
      :methemoglobin -> "%"
      :potassium -> "mmol/L"
      :sodium -> "mmol/L"
      :ionized_calcium -> "mmol/L"
      :ionized_calcium_corrected_to_ph_7_4 -> "mmol/L"
      :chloride -> "mmol/L"
      :glucose -> "mmol/L"
      :lactate -> "mmol/L"
    end
  end

  @impl Astrup.Analyzer
  def blank_parameter_quiz_selections() do
    Map.new(parameters(), fn parameter -> {parameter, {nil, nil}} end)
  end
end
