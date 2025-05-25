defmodule Astrup do
  @moduledoc """
  Astrup keeps the contexts that define your domain
  and business logic.

  Contexts are also responsible for managing your data, regardless
  if it comes from the database, an external API or others.
  """

  use Gettext, backend: AstrupWeb.Gettext

  def printouts() do
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

  def random_printout(), do: Enum.random(printouts())

  def get_parameter_label(id) do
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

  def reference_ranges(id) do
    case id do
      0 -> {Decimal.new("7.35"), Decimal.new("7.45"), nil, :decimal}
      1 -> {Decimal.new("4.5"), Decimal.new("6.0"), "kPa", :decimal}
      2 -> {Decimal.new("10.3"), Decimal.new("13.0"), "kPa", :decimal}
      3 -> {Decimal.new("22.0"), Decimal.new("27.0"), "mmol/l", :integer}
      4 -> {Decimal.new("-3.0"), Decimal.new("3.0"), "mmol/l", :integer}
      5 -> {Decimal.new("8.0"), Decimal.new("16.0"), "mmol/l", :integer}
      6 -> {Decimal.new("134.0"), Decimal.new("167.0"), "g/l", :integer}
      7 -> {Decimal.new("18.0"), Decimal.new("23.0"), "%", :integer}
      8 -> {Decimal.new("95.0"), Decimal.new("100.0"), "%", :integer}
      9 -> {Decimal.new("0.0"), Decimal.new("2.3"), "%", :decimal}
      10 -> {Decimal.new("0.0"), Decimal.new("2.0"), "%", :integer}
      11 -> {Decimal.new("3.3"), Decimal.new("4.8"), "mmol/l", :decimal}
      12 -> {Decimal.new("137.0"), Decimal.new("144.0"), "mmol/l", :integer}
      13 -> {Decimal.new("1.15"), Decimal.new("1.30"), "mmol/l", :decimal}
      14 -> {Decimal.new("1.15"), Decimal.new("1.30"), "mmol/l", :decimal}
      15 -> {Decimal.new("96.0"), Decimal.new("111.0"), "mmol/l", :integer}
      16 -> {Decimal.new("4.0"), Decimal.new("6.0"), "mmol/l", :integer}
      17 -> {Decimal.new("0.5"), Decimal.new("1.6"), "mmol/l", :decimal}
    end
  end

  def check_reference_range(id, value) do
    {min, max, _unit, _display_type} = reference_ranges(id)

    cond do
      Decimal.gte?(value, max) -> :high
      Decimal.lte?(value, min) -> :low
      Decimal.gte?(value, min) and Decimal.lte?(value, max) -> :normal
    end
  end

  def pretty_print_reference_range(id) do
    {min, max, unit, display_type} = reference_ranges(id)

    case display_type do
      :decimal -> "#{min} - #{max} #{unit}"
      :integer -> "#{Decimal.to_integer(min)} - #{Decimal.to_integer(max)} #{unit}"
    end
  end
end
