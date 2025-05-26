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
      # COPD
      %{
        0 => Decimal.new("7.335"),
        1 => Decimal.new("8.9"),
        2 => Decimal.new("6.7"),
        3 => Decimal.new("30.5"),
        4 => Decimal.new("2.8"),
        5 => Decimal.new("14.2"),
        6 => Decimal.new("135"),
        7 => Decimal.new("12.1"),
        8 => Decimal.new("85.3"),
        9 => Decimal.new("1.8"),
        10 => Decimal.new("0.9"),
        11 => Decimal.new("4.1"),
        12 => Decimal.new("138"),
        13 => Decimal.new("1.15"),
        14 => Decimal.new("1.18"),
        15 => Decimal.new("99"),
        16 => Decimal.new("7.2"),
        17 => Decimal.new("1.9"),
        id: "10000"
      },
      # DKA
      %{
        0 => Decimal.new("7.152"),
        1 => Decimal.new("3.1"),
        2 => Decimal.new("13.5"),
        3 => Decimal.new("8.5"),
        4 => Decimal.new("-18.7"),
        5 => Decimal.new("25.3"),
        6 => Decimal.new("155"),
        7 => Decimal.new("18.2"),
        8 => Decimal.new("95.9"),
        9 => Decimal.new("0.6"),
        10 => Decimal.new("0.8"),
        11 => Decimal.new("5.8"),
        12 => Decimal.new("130"),
        13 => Decimal.new("1.10"),
        14 => Decimal.new("1.19"),
        15 => Decimal.new("90"),
        16 => Decimal.new("28.5"),
        17 => Decimal.new("4.2"),
        id: "10001"
      },
      # Spesis with lactic acidosis
      %{
        0 => Decimal.new("7.238"),
        1 => Decimal.new("4.5"),
        2 => Decimal.new("8.9"),
        3 => Decimal.new("15.0"),
        4 => Decimal.new("-10.1"),
        5 => Decimal.new("19.5"),
        6 => Decimal.new("110"),
        7 => Decimal.new("10.5"),
        8 => Decimal.new("89.0"),
        9 => Decimal.new("0.7"),
        10 => Decimal.new("1.1"),
        11 => Decimal.new("4.9"),
        12 => Decimal.new("133"),
        13 => Decimal.new("1.08"),
        14 => Decimal.new("1.14"),
        15 => Decimal.new("100"),
        16 => Decimal.new("9.8"),
        17 => Decimal.new("7.5"),
        id: "10002"
      },
      # Panic attack / hyperventilation
      %{
        0 => Decimal.new("7.553"),
        1 => Decimal.new("3.4"),
        2 => Decimal.new("15.1"),
        3 => Decimal.new("23.8"),
        4 => Decimal.new("2.5"),
        5 => Decimal.new("9.0"),
        6 => Decimal.new("128"),
        7 => Decimal.new("17.0"),
        8 => Decimal.new("98.5"),
        9 => Decimal.new("0.4"),
        10 => Decimal.new("0.6"),
        11 => Decimal.new("3.3"),
        12 => Decimal.new("140"),
        13 => Decimal.new("1.05"),
        14 => Decimal.new("0.98"),
        15 => Decimal.new("105"),
        16 => Decimal.new("5.9"),
        17 => Decimal.new("1.0"),
        id: "10003"
      },
      # Chronic Renal Failure
      %{
        0 => Decimal.new("7.325"),
        1 => Decimal.new("4.7"),
        2 => Decimal.new("11.5"),
        3 => Decimal.new("17.2"),
        4 => Decimal.new("-6.0"),
        5 => Decimal.new("16.1"),
        6 => Decimal.new("95"),
        7 => Decimal.new("9.9"),
        8 => Decimal.new("92.3"),
        9 => Decimal.new("0.8"),
        10 => Decimal.new("0.7"),
        11 => Decimal.new("5.9"),
        12 => Decimal.new("136"),
        13 => Decimal.new("1.02"),
        14 => Decimal.new("1.07"),
        15 => Decimal.new("107"),
        16 => Decimal.new("6.8"),
        17 => Decimal.new("1.4"),
        id: "10004"
      },
      # Salicylate overdose (early presentation)
      %{
        0 => Decimal.new("7.488"),
        1 => Decimal.new("2.9"),
        2 => Decimal.new("14.8"),
        3 => Decimal.new("18.0"),
        4 => Decimal.new("-1.5"),
        5 => Decimal.new("18.0"),
        6 => Decimal.new("140"),
        7 => Decimal.new("18.1"),
        8 => Decimal.new("97.8"),
        9 => Decimal.new("0.5"),
        10 => Decimal.new("0.6"),
        11 => Decimal.new("3.7"),
        12 => Decimal.new("142"),
        13 => Decimal.new("1.16"),
        14 => Decimal.new("1.10"),
        15 => Decimal.new("108"),
        16 => Decimal.new("7.1"),
        17 => Decimal.new("3.1"),
        id: "10005"
      },
      # Severe dehydration / hypovolemic shock
      %{
        0 => Decimal.new("7.291"),
        1 => Decimal.new("4.0"),
        2 => Decimal.new("10.1"),
        3 => Decimal.new("14.5"),
        4 => Decimal.new("-9.2"),
        5 => Decimal.new("17.8"),
        6 => Decimal.new("170"),
        7 => Decimal.new("17.5"),
        8 => Decimal.new("91.5"),
        9 => Decimal.new("0.7"),
        10 => Decimal.new("0.9"),
        11 => Decimal.new("4.6"),
        12 => Decimal.new("152"),
        13 => Decimal.new("1.22"),
        14 => Decimal.new("1.29"),
        15 => Decimal.new("115"),
        16 => Decimal.new("6.5"),
        17 => Decimal.new("5.8"),
        id: "10006"
      },
      # Carbon monoxide poisoning
      %{
        0 => Decimal.new("7.305"),
        1 => Decimal.new("5.8"),
        2 => Decimal.new("35.2"),
        3 => Decimal.new("20.1"),
        4 => Decimal.new("-5.5"),
        5 => Decimal.new("15.0"),
        6 => Decimal.new("142"),
        7 => Decimal.new("13.5"),
        8 => Decimal.new("98.8"),
        9 => Decimal.new("22.5"),
        10 => Decimal.new("1.0"),
        11 => Decimal.new("4.0"),
        12 => Decimal.new("139"),
        13 => Decimal.new("1.17"),
        14 => Decimal.new("1.23"),
        15 => Decimal.new("103"),
        16 => Decimal.new("8.0"),
        17 => Decimal.new("3.9"),
        id: "10007"
      },
      # Pulmonary embolism
      %{
        0 => Decimal.new("7.492"),
        1 => Decimal.new("3.8"),
        2 => Decimal.new("7.9"),
        3 => Decimal.new("22.5"),
        4 => Decimal.new("1.3"),
        5 => Decimal.new("10.5"),
        6 => Decimal.new("120"),
        7 => Decimal.new("12.0"),
        8 => Decimal.new("88.9"),
        9 => Decimal.new("0.6"),
        10 => Decimal.new("0.7"),
        11 => Decimal.new("3.6"),
        12 => Decimal.new("141"),
        13 => Decimal.new("1.12"),
        14 => Decimal.new("1.06"),
        15 => Decimal.new("106"),
        16 => Decimal.new("6.1"),
        17 => Decimal.new("1.7"),
        id: "10008"
      },
      # Patient on Optiflow (acute asthma attack - improving)
      %{
        0 => Decimal.new("7.431"),
        1 => Decimal.new("5.0"),
        2 => Decimal.new("30.5"),
        3 => Decimal.new("24.8"),
        4 => Decimal.new("0.5"),
        5 => Decimal.new("11.2"),
        6 => Decimal.new("133"),
        7 => Decimal.new("18.5"),
        8 => Decimal.new("99.5"),
        9 => Decimal.new("0.4"),
        10 => Decimal.new("0.5"),
        11 => Decimal.new("3.8"),
        12 => Decimal.new("137"),
        13 => Decimal.new("1.18"),
        14 => Decimal.new("1.17"),
        15 => Decimal.new("102"),
        16 => Decimal.new("7.9"),
        17 => Decimal.new("1.5"),
        id: "10009"
      },
      # Near-drowning incident (freshwater aspiration)
      %{
        0 => Decimal.new("7.189"),
        1 => Decimal.new("7.5"),
        2 => Decimal.new("7.1"),
        3 => Decimal.new("19.5"),
        4 => Decimal.new("-8.8"),
        5 => Decimal.new("16.5"),
        6 => Decimal.new("105"),
        7 => Decimal.new("8.5"),
        8 => Decimal.new("79.2"),
        9 => Decimal.new("0.9"),
        10 => Decimal.new("1.2"),
        11 => Decimal.new("5.4"),
        12 => Decimal.new("129"),
        13 => Decimal.new("1.03"),
        14 => Decimal.new("1.10"),
        15 => Decimal.new("95"),
        16 => Decimal.new("4.3"),
        17 => Decimal.new("6.1"),
        id: "10010"
      },
      # Normal
      %{
        0 => Decimal.new("7.405"),
        1 => Decimal.new("5.32"),
        2 => Decimal.new("12.8"),
        3 => Decimal.new("24.5"),
        4 => Decimal.new("0.1"),
        5 => Decimal.new("10.0"),
        6 => Decimal.new("138"),
        7 => Decimal.new("18.6"),
        8 => Decimal.new("97.5"),
        9 => Decimal.new("0.8"),
        10 => Decimal.new("0.6"),
        11 => Decimal.new("4.2"),
        12 => Decimal.new("140"),
        13 => Decimal.new("1.22"),
        14 => Decimal.new("1.22"),
        15 => Decimal.new("103"),
        16 => Decimal.new("5.1"),
        17 => Decimal.new("0.9"),
        id: "10011"
      },
      # Normal
      %{
        0 => Decimal.new("7.388"),
        1 => Decimal.new("5.59"),
        2 => Decimal.new("11.9"),
        3 => Decimal.new("25.1"),
        4 => Decimal.new("-0.5"),
        5 => Decimal.new("11.5"),
        6 => Decimal.new("155"),
        7 => Decimal.new("20.1"),
        8 => Decimal.new("96.8"),
        9 => Decimal.new("1.1"),
        10 => Decimal.new("0.7"),
        11 => Decimal.new("3.9"),
        12 => Decimal.new("142"),
        13 => Decimal.new("1.19"),
        14 => Decimal.new("1.18"),
        15 => Decimal.new("105"),
        16 => Decimal.new("4.8"),
        17 => Decimal.new("1.2"),
        id: "10012"
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

  def units_for_parameter(:abl90, id) do
    case id do
      0 -> ""
      1 -> "kPa"
      2 -> "kPa"
      3 -> "mmol/L"
      4 -> "mmol/L"
      5 -> "mmol/L"
      6 -> "g/L"
      7 -> "Vol%"
      8 -> "%"
      9 -> "%"
      10 -> "%"
      11 -> "mmol/L"
      12 -> "mmol/L"
      13 -> "mmol/L"
      14 -> "mmol/L"
      15 -> "mmol/L"
      16 -> "mmol/L"
      17 -> "mmol/L"
    end
  end

  def reference_ranges(id) do
    case id do
      0 -> {Decimal.new("7.35"), Decimal.new("7.45"), "", :decimal}
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
