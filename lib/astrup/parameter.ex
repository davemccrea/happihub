defmodule Astrup.Parameter do
  use Gettext, backend: AstrupWeb.Gettext

  @spec get_label(atom()) :: String.t()
  def get_label(parameter) do
    case parameter do
      :ph -> gettext("pH")
      :pco2 -> gettext("Partial pressure of carbon dioxide")
      :po2 -> gettext("Partial pressure of oxygen")
      :bicarbonate -> gettext("Bicarbonate")
      :base_excess -> gettext("Base excess")
      :anion_gap -> gettext("Anion gap")
      :hemoglobin -> gettext("Hemoglobin")
      :oxygen_content -> gettext("Oxygen content")
      :oxygen_saturation -> gettext("Oxygen saturation")
      :carboxyhemoglobin -> gettext("Carboxyhemoglobin")
      :methemoglobin -> gettext("Methemoglobin")
      :potassium -> gettext("Potassium")
      :sodium -> gettext("Sodium")
      :ionized_calcium -> gettext("Ionized calcium")
      :ionized_calcium_corrected_to_ph_7_4 -> gettext("Ionized calcium corrected to pH 7.4")
      :chloride -> gettext("Chloride")
      :glucose -> gettext("Glucose")
      :lactate -> gettext("Lactate")
    end
  end
end
