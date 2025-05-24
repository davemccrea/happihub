defmodule Astrup.Result do
  use Gettext, backend: AstrupWeb.Gettext

  def db() do
    [
      %{
        0 => Decimal.new("7.446"),
        1 => Decimal.new("4.88"),
        2 => Decimal.new("14.5"),
        3 => Decimal.new("25.2"),
        4 => Decimal.new("1.1"),
        5 => Decimal.new("6.9"),
        6 => Decimal.new("107"),
        7 => Decimal.new("14.5"),
        8 => Decimal.new("96.7"),
        9 => Decimal.new("0.5"),
        10 => Decimal.new("0.7"),
        11 => Decimal.new("3.7"),
        12 => Decimal.new("143"),
        13 => Decimal.new("1.19"),
        14 => Decimal.new("1.19"),
        15 => Decimal.new("111"),
        16 => Decimal.new("8.7"),
        17 => Decimal.new("0.7")
      }
    ]
  end

  @spec label(integer()) :: String.t()
  def label(id) do
    case id do
      0 -> gettext("pH")
      1 -> gettext("Partial pressure of carbon dioxide")
      2 -> gettext("Partial pressure of oxygen")
      3 -> gettext("Bicarbonate")
      4 -> gettext("Base excess")
      5 -> gettext("Anion gap")
      6 -> gettext("Hemoglobin")
      7 -> gettext("Oxygen content")
      8 -> gettext("Oxygen saturation")
      9 -> gettext("Carboxyhemoglobin")
      10 -> gettext("Methemoglobin")
      11 -> gettext("Potassium")
      12 -> gettext("Sodium")
      13 -> gettext("Ionized calcium")
      14 -> gettext("Ionized calcium corrected to pH 7.4")
      15 -> gettext("Chloride")
      16 -> gettext("Glucose")
      17 -> gettext("Lactate")
    end
  end

  @spec reference_ranges(integer()) ::
          {String.t(), Decimal.t(), Decimal.t(), String.t() | nil, atom()}
  def reference_ranges(id), do: reference_ranges(:fimlab, id)

  @spec reference_ranges(atom(), integer()) ::
          {String.t(), Decimal.t(), Decimal.t(), String.t() | nil, atom()}
  def reference_ranges(:fimlab, id) do
    case id do
      0 -> {"aB-pH", Decimal.new("7.35"), Decimal.new("7.45"), nil, :decimal}
      1 -> {"aB-pCO2", Decimal.new("4.5"), Decimal.new("6.0"), "kPa", :decimal}
      2 -> {"aB-pO2", Decimal.new("10.3"), Decimal.new("13.0"), "kPa", :decimal}
      3 -> {"aB-aHCO3", Decimal.new("22.0"), Decimal.new("27.0"), "mmol/l", :integer}
      4 -> {"aB-BE", Decimal.new("-3.0"), Decimal.new("3.0"), "mmol/l", :integer}
      5 -> {"P -Angap", Decimal.new("8.0"), Decimal.new("16.0"), "mmol/l", :integer}
      6 -> {"aB-Hb", Decimal.new("134.0"), Decimal.new("167.0"), "g/l", :integer}
      7 -> {"aB-O2-Sis", Decimal.new("18.0"), Decimal.new("23.0"), "%", :integer}
      8 -> {"aB-HbO2Sat", Decimal.new("95.0"), Decimal.new("100.0"), "%", :integer}
      9 -> {"B -Hb-CO", Decimal.new("0.0"), Decimal.new("2.3"), "%", :decimal}
      10 -> {"B -Hb-met", Decimal.new("0.0"), Decimal.new("2.0"), "%", :integer}
      11 -> {"P -K-Veka", Decimal.new("3.3"), Decimal.new("4.8"), "mmol/l", :decimal}
      12 -> {"P -Na-Veka", Decimal.new("137.0"), Decimal.new("144.0"), "mmol/l", :integer}
      13 -> {"P -Ca(7.4)", Decimal.new("1.15"), Decimal.new("1.30"), "mmol/l", :decimal}
      14 -> {"P -Ca-Ion", Decimal.new("1.15"), Decimal.new("1.30"), "mmol/l", :decimal}
      15 -> {"P -Cl", Decimal.new("96.0"), Decimal.new("111.0"), "mmol/l", :integer}
      16 -> {"aB -Gluk", Decimal.new("4.0"), Decimal.new("6.0"), "mmol/l", :integer}
      17 -> {"aB -Laktaat", Decimal.new("0.5"), Decimal.new("1.6"), "mmol/l", :decimal}
    end
  end

  def check_reference_range(id, value) do
    {_, min, max, _, _} = reference_ranges(id)

    cond do
      Decimal.gte?(value, max) -> :high
      Decimal.lte?(value, min) -> :low
      Decimal.gte?(value, min) and Decimal.lte?(value, max) -> :normal
    end
  end

  def format_reference_range(id) do
    {_, min, max, unit, display_type} = reference_ranges(id)

    case display_type do
      :decimal -> "#{min} - #{max} #{unit}"
      :integer -> "#{Decimal.to_integer(min)} - #{Decimal.to_integer(max)} #{unit}"
    end
  end
end
